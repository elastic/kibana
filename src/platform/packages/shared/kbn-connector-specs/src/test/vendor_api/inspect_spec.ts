/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenApiDocument } from '@kbn/connector-contract-mock';
import type { JsonObject } from './json_pointer';
import { getAtTokens, isJsonObject, localRefToPointer, toTokens } from './json_pointer';
import { assessPagination } from './propose_pagination';

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

const DESCRIPTION_LENGTH = 200;

// Objects whose keys are property names, not schema keywords.
const SCHEMA_NAME_MAPS = new Set([
  'properties',
  'patternProperties',
  '$defs',
  'definitions',
  'dependentSchemas',
]);
// Values that are data, so they are copied as they are.
const SCHEMA_LITERALS = new Set(['enum', 'const', 'default', 'required']);
const SCHEMA_DROPPED = new Set(['example', 'examples', 'externalDocs', 'xml', 'title']);

export interface OperationSummary {
  readonly method: string;
  readonly path: string;
  readonly operationId?: string;
  readonly summary?: string;
  readonly deprecated?: boolean;
}

export interface DescribeOperationOptions {
  /** How many `$ref`s deep schemas are inlined; deeper and recursive refs stay `$ref`s. */
  readonly depth?: number;
}

const resolveLocal = (document: OpenApiDocument, value: unknown, seen = new Set<string>()) => {
  if (!isJsonObject(value) || typeof value.$ref !== 'string' || seen.has(value.$ref)) {
    return value;
  }
  const pointer = localRefToPointer(value.$ref);
  if (pointer === undefined) {
    return value;
  }
  seen.add(value.$ref);
  return resolveLocal(document, getAtTokens(document, toTokens(pointer)), seen);
};

const resolveObject = (document: OpenApiDocument, value: unknown): JsonObject => {
  const resolved = resolveLocal(document, value);
  return isJsonObject(resolved) ? resolved : {};
};

const shorten = (text: unknown): string | undefined => {
  if (typeof text !== 'string') {
    return undefined;
  }
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > DESCRIPTION_LENGTH ? `${flat.slice(0, DESCRIPTION_LENGTH - 1)}…` : flat;
};

const withoutUndefined = (value: Record<string, unknown>): JsonObject =>
  Object.fromEntries(Object.entries(value).filter(([, child]) => child !== undefined));

const omit = (value: JsonObject, keys: readonly string[]): JsonObject =>
  Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));

const inlineSchema = (
  document: OpenApiDocument,
  schema: unknown,
  depth: number,
  seen: readonly string[] = []
): unknown => {
  if (Array.isArray(schema)) {
    return schema.map((item) => inlineSchema(document, item, depth, seen));
  }
  if (!isJsonObject(schema)) {
    return schema;
  }
  const { $ref, ...siblings } = schema;
  if (typeof $ref === 'string') {
    const pointer = localRefToPointer($ref);
    const target = pointer === undefined ? undefined : getAtTokens(document, toTokens(pointer));
    if (depth <= 0 || seen.includes($ref) || !isJsonObject(target)) {
      return schema;
    }
    const inlined = inlineSchema(document, target, depth - 1, [...seen, $ref]);
    return Object.keys(siblings).length === 0
      ? inlined
      : {
          ...(inlined as JsonObject),
          ...(inlineSchema(document, siblings, depth, seen) as JsonObject),
        };
  }
  const result: JsonObject = {};
  for (const [key, child] of Object.entries(schema)) {
    if (SCHEMA_DROPPED.has(key) || key.startsWith('x-')) {
      continue;
    }
    if (key === 'description') {
      result[key] = shorten(child);
    } else if (SCHEMA_LITERALS.has(key)) {
      result[key] = child;
    } else if (SCHEMA_NAME_MAPS.has(key) && isJsonObject(child)) {
      result[key] = Object.fromEntries(
        Object.entries(child).map(([name, value]) => [
          name,
          inlineSchema(document, value, depth, seen),
        ])
      );
    } else {
      result[key] = inlineSchema(document, child, depth, seen);
    }
  }
  return result;
};

const describeContent = (document: OpenApiDocument, content: unknown, depth: number) =>
  isJsonObject(content)
    ? Object.fromEntries(
        Object.entries(content).map(([mediaType, value]) => [
          mediaType,
          inlineSchema(document, resolveObject(document, value).schema, depth),
        ])
      )
    : undefined;

const DEFAULT_STYLE: Readonly<Record<string, string>> = {
  query: 'form',
  cookie: 'form',
  path: 'simple',
  header: 'simple',
};

const describeParameters = (
  document: OpenApiDocument,
  pathItem: JsonObject,
  operation: JsonObject,
  depth: number
): JsonObject[] => {
  const byKey = new Map<string, JsonObject>();
  for (const list of [pathItem.parameters, operation.parameters]) {
    for (const entry of Array.isArray(list) ? list : []) {
      const parameter = resolveObject(document, entry);
      byKey.set(`${parameter.in}:${parameter.name}`, parameter);
    }
  }
  return [...byKey.values()].map((parameter) => {
    const location = String(parameter.in);
    const style = typeof parameter.style === 'string' ? parameter.style : DEFAULT_STYLE[location];
    return withoutUndefined({
      name: parameter.name,
      in: location,
      required: location === 'path' ? true : parameter.required === true,
      description: shorten(parameter.description),
      deprecated: parameter.deprecated === true ? true : undefined,
      ...(parameter.content === undefined
        ? {
            style,
            explode: typeof parameter.explode === 'boolean' ? parameter.explode : style === 'form',
            schema: inlineSchema(document, parameter.schema, depth),
          }
        : { content: describeContent(document, parameter.content, depth) }),
    });
  });
};

const isSuccess = (status: string) => /^[23]/.test(status) || status === 'default';

const describeResponses = (document: OpenApiDocument, responses: unknown, depth: number) =>
  Object.fromEntries(
    Object.entries(isJsonObject(responses) ? responses : {}).map(([status, value]) => {
      const response = resolveObject(document, value);
      const content = isJsonObject(response.content) ? response.content : {};
      return [
        status,
        withoutUndefined({
          description: shorten(response.description),
          ...(isSuccess(status)
            ? { content: describeContent(document, content, depth) }
            : { contentTypes: Object.keys(content).length ? Object.keys(content) : undefined }),
        }),
      ];
    })
  );

const describeSecurity = (document: OpenApiDocument, operation: JsonObject) => {
  const requirements = operation.security ?? document.security;
  if (!Array.isArray(requirements)) {
    return undefined;
  }
  const schemes = resolveObject(document, getAtTokens(document, ['components', 'securitySchemes']));
  const used = new Set(requirements.flatMap((r) => (isJsonObject(r) ? Object.keys(r) : [])));
  return {
    // Alternatives: any one requirement object satisfies the operation.
    requirements,
    schemes: Object.fromEntries(
      [...used].map((name) => {
        const scheme = resolveObject(document, schemes[name]);
        const { flows } = scheme;
        return [
          name,
          withoutUndefined({
            ...omit(scheme, ['description', 'flows']),
            // Scope descriptions are left out; the requirements name the scopes needed.
            flows: isJsonObject(flows)
              ? Object.fromEntries(
                  Object.entries(flows).map(([flow, value]) => [
                    flow,
                    omit(resolveObject(document, value), ['scopes']),
                  ])
                )
              : undefined,
          }),
        ];
      })
    ),
  };
};

const describeServers = (servers: unknown) =>
  Array.isArray(servers)
    ? servers.filter(isJsonObject).map(({ url, variables }) =>
        withoutUndefined({
          url,
          variables: isJsonObject(variables)
            ? Object.fromEntries(
                Object.entries(variables).map(([name, variable]) => [
                  name,
                  isJsonObject(variable)
                    ? withoutUndefined({ default: variable.default, enum: variable.enum })
                    : variable,
                ])
              )
            : undefined,
        })
      )
    : undefined;

/** Lists every operation in an OpenAPI 3.x document, in document order. */
export const listOperations = (document: OpenApiDocument): OperationSummary[] => {
  const paths = isJsonObject(document.paths) ? document.paths : {};
  return Object.entries(paths).flatMap(([path, value]) => {
    const pathItem = resolveObject(document, value);
    return METHODS.flatMap((method) => {
      const operation = pathItem[method];
      if (!isJsonObject(operation)) {
        return [];
      }
      const { operationId } = operation;
      const summary = shorten(operation.summary ?? operation.description);
      const summaryEntry: OperationSummary = {
        method,
        path,
        ...(typeof operationId === 'string' ? { operationId } : {}),
        ...(summary === undefined ? {} : { summary }),
        ...(operation.deprecated === true ? { deprecated: true } : {}),
      };
      return [summaryEntry];
    });
  });
};

const withoutParameterNames = (path: string) => path.replace(/\{[^}]*\}/g, '{}');

/**
 * Finds an operation by `METHOD /path` or by `operationId`. Path parameter names don't need
 * to match the spec's: `GET /repos/{o}/{r}` finds `GET /repos/{owner}/{repo}`.
 */
export const findOperation = (
  document: OpenApiDocument,
  query: string
): OperationSummary | undefined => {
  const operations = listOperations(document);
  const [first, ...rest] = query.trim().split(/\s+/);
  if (rest.length === 0) {
    return operations.find(({ operationId }) => operationId === first);
  }
  const method = first.toLowerCase();
  const path = rest.join('');
  return (
    operations.find((operation) => operation.method === method && operation.path === path) ??
    operations.find(
      (operation) =>
        operation.method === method &&
        withoutParameterNames(operation.path) === withoutParameterNames(path)
    )
  );
};

/**
 * Describes one operation for writing a connector action against it: its servers, security,
 * parameters with their effective `style`/`explode`, request body and success response
 * schemas with `$ref`s inlined, and how it pages. Examples and `x-` extensions are left out
 * and descriptions shortened, so the result stays readable for large specs.
 */
export const describeOperation = (
  document: OpenApiDocument,
  { method, path }: { readonly method: string; readonly path: string },
  { depth = 4 }: DescribeOperationOptions = {}
): JsonObject | undefined => {
  const pathItem = resolveObject(
    document,
    isJsonObject(document.paths) ? document.paths[path] : undefined
  );
  const operation = pathItem[method];
  if (!isJsonObject(operation)) {
    return undefined;
  }
  const requestBody = resolveObject(document, operation.requestBody);
  const pagination = assessPagination(document as JsonObject, { method, path });
  return withoutUndefined({
    operation: `${method.toUpperCase()} ${path}`,
    operationId: operation.operationId,
    summary: shorten(operation.summary),
    description: shorten(operation.description),
    deprecated: operation.deprecated === true ? true : undefined,
    servers: describeServers(operation.servers ?? pathItem.servers ?? document.servers),
    security: describeSecurity(document, operation),
    parameters: describeParameters(document, pathItem, operation, depth),
    requestBody:
      operation.requestBody === undefined
        ? undefined
        : withoutUndefined({
            required: requestBody.required === true,
            content: describeContent(document, requestBody.content, depth),
          }),
    responses: describeResponses(document, operation.responses, depth),
    pagination: pagination.listLike
      ? withoutUndefined({
          reason: pagination.reason,
          proposal: pagination.proposal?.pagination,
          basis: pagination.proposal?.basis,
        })
      : undefined,
  });
};
