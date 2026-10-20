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
  ContractRequest,
  NamedOperation,
  ProtocolExchange,
  Violation,
} from '../contract/types';
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

/**
 * Answers GraphQL requests at the spec's endpoints. Each root field a request selects is an
 * operation, e.g. `query boards`. Documents that don't parse or validate against the schema,
 * and variables that don't coerce to their declared types, get 400; valid requests execute
 * against the schema with sampled values, so responses always match the selection set.
 */
export const createGraphQLProtocol = (spec: GraphQLSpec, source?: string): ContractProtocol => {
  const schema = buildCachedSchema(spec.sdl);
  return {
    endpoints: spec.endpoints.map((endpoint) => toEndpoint(new URL(endpoint))),
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
      // Schemas such as monday.com's declare @defer and @stream, which plain `execute` refuses.
      const result = await experimentalExecuteIncrementally({
        schema,
        document,
        operationName: params.operationName,
        variableValues: params.variables,
        fieldResolver: (_source, _args, _context, { returnType }) => sampleGraphQLValue(returnType),
        typeResolver: (_value, _context, info, abstractType) =>
          info.schema.getPossibleTypes(abstractType)[0]?.name,
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
      // Resolvers only sample, so every error is the request's: variables or arguments that
      // don't coerce to their types.
      if (result.errors?.length) {
        return rejected(operations, toViolations(result.errors, ['body', 'variables'], 'coercion'));
      }
      return {
        response: {
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          body: { data: result.data },
        },
        operations,
        requestViolations: [],
      };
    },
  };
};
