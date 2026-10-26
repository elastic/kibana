/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DocumentNode,
  FragmentDefinitionNode,
  GraphQLField,
  GraphQLSchema,
  OperationDefinitionNode,
  SelectionSetNode,
} from 'graphql';
import {
  GraphQLError,
  buildSchema,
  experimentalExecuteIncrementally,
  getOperationAST,
  parse,
  validate,
} from 'graphql';
import type {
  ContractProtocol,
  ContractProtocolOptions,
  ContractRequest,
  NamedOperation,
  ProtocolExchange,
  Violation,
} from '../contract/types';
import { selectNamedResponses } from '../engine/named_responses';
import type { StoredResponse } from '../engine/response_engine';
import { checkGraphQLValue, resolveStoredType } from './check_graphql_value';
import { sampleGraphQLValue } from './sample_graphql_value';

/** A vendor's GraphQL schema and the endpoints that serve it. */
export interface GraphQLSpec {
  readonly format: 'graphql';
  /** The schema in SDL, e.g. from the vendor's published schema file or an introspection. */
  readonly sdl: string;
  /** The URLs the vendor serves the schema at, e.g. `https://api.monday.com/v2`. */
  readonly endpoints: readonly string[];
}

interface GraphQLParams {
  readonly query: string;
  readonly operationName?: string;
  readonly variables?: Record<string, unknown>;
}

export const isGraphQLSpec = (spec: unknown): spec is GraphQLSpec =>
  typeof spec === 'object' &&
  spec !== null &&
  (spec as Partial<GraphQLSpec>).format === 'graphql' &&
  typeof (spec as Partial<GraphQLSpec>).sdl === 'string';

/** The `origin` and `pathname` of a URL, without a trailing slash, as protocols key endpoints. */
export const toEndpoint = (url: URL): string => `${url.origin}${url.pathname.replace(/\/$/, '')}`;

const violation = (path: string[], code: string, message: string): Violation => ({
  path,
  code,
  message,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseJsonParam = (value: string | string[] | undefined): unknown => {
  if (typeof value !== 'string') {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const readParams = ({ method, query, body }: ContractRequest): GraphQLParams | Violation => {
  const raw =
    method === 'get'
      ? {
          query: query.query,
          operationName: query.operationName,
          variables: parseJsonParam(query.variables),
        }
      : body;
  const location = method === 'get' ? 'query' : 'body';
  if (!isRecord(raw) || typeof raw.query !== 'string') {
    return violation([location, 'query'], 'required', 'The request has no GraphQL query string');
  }
  const { operationName, variables } = raw;
  if (operationName !== undefined && operationName !== null && typeof operationName !== 'string') {
    return violation([location, 'operationName'], 'type', 'operationName must be a string');
  }
  if (variables !== undefined && variables !== null && !isRecord(variables)) {
    return violation([location, 'variables'], 'type', 'variables must be an object');
  }
  return {
    query: raw.query,
    operationName: operationName ?? undefined,
    variables: variables ?? undefined,
  };
};

const rootFieldNames = (
  selectionSet: SelectionSetNode,
  fragments: ReadonlyMap<string, FragmentDefinitionNode>,
  visited = new Set<string>()
): string[] =>
  selectionSet.selections.flatMap((selection) => {
    if (selection.kind === 'Field') {
      return selection.name.value.startsWith('__') ? [] : [selection.name.value];
    }
    if (selection.kind === 'InlineFragment') {
      return rootFieldNames(selection.selectionSet, fragments, visited);
    }
    const fragment = fragments.get(selection.name.value);
    if (!fragment || visited.has(fragment.name.value)) {
      return [];
    }
    visited.add(fragment.name.value);
    return rootFieldNames(fragment.selectionSet, fragments, visited);
  });

const toOperations = (
  document: DocumentNode,
  operation: OperationDefinitionNode,
  source: string | undefined
): NamedOperation[] => {
  const fragments = new Map(
    document.definitions.flatMap((definition) =>
      definition.kind === 'FragmentDefinition' ? [[definition.name.value, definition]] : []
    )
  );
  return [...new Set(rootFieldNames(operation.selectionSet, fragments))].map((field) => ({
    name: `${operation.operation} ${field}`,
    ...(source === undefined ? {} : { source }),
    readOnly: operation.operation === 'query',
  }));
};

const toViolations = (errors: readonly GraphQLError[], path: string[], code: string): Violation[] =>
  errors.map(({ message }) => violation(path, code, message));

const rejected = (
  operations: readonly NamedOperation[],
  requestViolations: readonly Violation[]
): ProtocolExchange => ({
  response: {
    statusCode: 400,
    headers: { 'content-type': 'application/json' },
    body: { errors: requestViolations.map(({ message }) => ({ message })) },
  },
  operations,
  requestViolations,
});

// Building a schema the size of monday.com's takes tens of milliseconds, so mocks share it.
const builtSchemas = new Map<string, GraphQLSchema>();

const buildCachedSchema = (sdl: string): GraphQLSchema => {
  const schema = builtSchemas.get(sdl) ?? buildSchema(sdl);
  builtSchemas.set(sdl, schema);
  return schema;
};

type RootField = GraphQLField<unknown, unknown>;

// Each root field of the query and mutation types, by operation name such as `query boards`.
const declareOperations = (schema: GraphQLSchema): Map<string, RootField> => {
  const operations = new Map<string, RootField>();
  const roots = [
    ['query', schema.getQueryType()],
    ['mutation', schema.getMutationType()],
  ] as const;
  for (const [kind, type] of roots) {
    for (const field of Object.values(type?.getFields() ?? {})) {
      operations.set(`${kind} ${field.name}`, field);
    }
  }
  return operations;
};

// A stored response is the vendor's body for a document selecting only that root field, unaliased.
const readStoredData = ({ body }: StoredResponse): Record<string, unknown> | undefined =>
  isRecord(body) && isRecord(body.data) ? body.data : undefined;

const checkStoredResponse =
  (schema: GraphQLSchema, operations: ReadonlyMap<string, RootField>) =>
  (name: string, response: StoredResponse): Violation[] => {
    const field = operations.get(name);
    if (!field) {
      return [];
    }
    const path = ['body', 'data', field.name];
    const data = readStoredData(response);
    if (!data || !(field.name in data)) {
      return [violation(path, 'required', `The response has no data for ${field.name}`)];
    }
    return checkGraphQLValue(schema, field.type, data[field.name], path);
  };

/**
 * Answers GraphQL requests at the spec's endpoints. Each root field a request selects is an
 * operation, e.g. `query boards`. Documents that don't parse or validate against the schema,
 * and variables that don't coerce to their declared types, get 400; valid requests execute
 * against the schema, so responses always match the selection set. A root field with a fixture
 * or recording resolves from its stored value, sampling the selected fields the value lacks;
 * other fields are sampled.
 */
export const createGraphQLProtocol = (
  spec: GraphQLSpec,
  { source, responses = [] }: ContractProtocolOptions = {}
): ContractProtocol => {
  const schema = buildCachedSchema(spec.sdl);
  const declared = declareOperations(schema);
  const operationNames = new Set(declared.keys());
  const { served, rejected: rejectedResponses } = selectNamedResponses(responses, {
    source,
    operations: operationNames,
    check: checkStoredResponse(schema, declared),
    isError: ({ body }) => isRecord(body) && Array.isArray(body.errors) && body.errors.length > 0,
  });
  return {
    endpoints: spec.endpoints.map((endpoint) => toEndpoint(new URL(endpoint))),
    operations: operationNames,
    rejectedResponses,
    handle: async (request) => {
      if (request.method !== 'get' && request.method !== 'post') {
        return rejected(
          [],
          [violation(['method'], 'method', 'GraphQL requests must use GET or POST')]
        );
      }
      const params = readParams(request);
      if ('code' in params) {
        return rejected([], [params]);
      }
      let document: DocumentNode;
      try {
        document = parse(params.query);
      } catch (error) {
        const message = error instanceof GraphQLError ? error.message : String(error);
        return rejected([], [violation(['body', 'query'], 'syntax', message)]);
      }
      const operation = getOperationAST(document, params.operationName);
      const operations = operation ? toOperations(document, operation, source) : [];
      const validationErrors = validate(schema, document);
      if (validationErrors.length > 0) {
        return rejected(
          operations,
          toViolations(validationErrors, ['body', 'query'], 'validation')
        );
      }
      if (!operation) {
        const message = params.operationName
          ? `The document has no operation named ${params.operationName}`
          : 'The document has several operations, so the request must name one';
        return rejected([], [violation(['body', 'operationName'], 'operation', message)]);
      }
      if (request.method === 'get' && operation.operation !== 'query') {
        return rejected(operations, [
          violation(['method'], 'method', `A ${operation.operation} must be sent with POST`),
        ]);
      }
      // The response keys (aliases) of the root fields resolved from a stored response.
      const fromStored = new Set<string>();
      // The root fields executed, which leaves out those that @skip or @include drop.
      const executed = new Set<string>();
      // Schemas such as monday.com's declare @defer and @stream, which plain `execute` refuses.
      const result = await experimentalExecuteIncrementally({
        schema,
        document,
        operationName: params.operationName,
        variableValues: params.variables,
        fieldResolver: (parent, _args, _context, info) => {
          const { fieldName, returnType, path } = info;
          if (path.prev === undefined) {
            const name = `${info.operation.operation} ${fieldName}`;
            executed.add(name);
            const stored = served.get(name);
            if (!stored) {
              return sampleGraphQLValue(returnType);
            }
            fromStored.add(String(path.key));
            return readStoredData(stored.response)?.[fieldName];
          }
          // Sampled objects are empty, so only stored values have fields of their own.
          return isRecord(parent) && Object.hasOwn(parent, fieldName)
            ? parent[fieldName]
            : sampleGraphQLValue(returnType);
        },
        typeResolver: (value, _context, info, abstractType) =>
          resolveStoredType(info.schema, abstractType, value)?.name,
      });
      if ('initialResult' in result) {
        return {
          response: {
            statusCode: 501,
            headers: { 'content-type': 'application/json' },
            body: { errors: [{ message: 'The contract mock does not stream @defer or @stream' }] },
          },
          operations,
          requestViolations: [],
        };
      }
      // Sampled values always fit the schema, so errors outside stored root fields are the
      // request's: variables or arguments that don't coerce to their types. Errors inside them
      // are a fixture breaking the spec, answered as a vendor would, with partial data.
      const errors = result.errors ?? [];
      const isStoredError = ({ path }: GraphQLError) =>
        path !== undefined && fromStored.has(String(path[0]));
      const requestErrors = errors.filter((error) => !isStoredError(error));
      if (requestErrors.length > 0) {
        return rejected(operations, toViolations(requestErrors, ['body', 'variables'], 'coercion'));
      }
      const responseViolations = errors.map(({ message, path = [] }) =>
        violation(['body', 'data', ...path.map(String)], 'response', message)
      );
      return {
        response: {
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          body:
            errors.length > 0
              ? {
                  data: result.data,
                  errors: errors.map(({ message, path }) => ({ message, path })),
                }
              : { data: result.data },
        },
        operations: operations.filter(({ name }) => executed.has(name)),
        requestViolations: [],
        responseViolations,
      };
    },
  };
};
