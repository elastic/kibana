/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendPointer, resolveObject } from './json_pointer';
import { isRecord } from './schema_walk';
import type {
  ContractOperation,
  ContractSpec,
  MediaTypeContent,
  OpenApiDocument,
  OperationHeader,
  OperationParameter,
  OperationServer,
  ParameterLocation,
  SpecSchema,
} from './types';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

const PARAMETER_LOCATIONS: readonly string[] = ['path', 'query', 'header', 'cookie'];

const isParameterLocation = (value: unknown): value is ParameterLocation =>
  typeof value === 'string' && PARAMETER_LOCATIONS.includes(value);

// Skips `x-` specification extensions, which may appear among paths and responses.
const entriesOf = (value: unknown): Array<[string, unknown]> =>
  isRecord(value) ? Object.entries(value).filter(([key]) => !key.startsWith('x-')) : [];

const toSchema = (owner: Record<string, unknown>, pointer: string): SpecSchema | undefined =>
  isRecord(owner.schema)
    ? { pointer: appendPointer(pointer, 'schema'), schema: owner.schema }
    : undefined;

const toContents = (owner: Record<string, unknown>, pointer: string): MediaTypeContent[] =>
  entriesOf(owner.content).flatMap(([mediaType, content]) =>
    isRecord(content)
      ? [
          {
            mediaType,
            schema: toSchema(content, appendPointer(appendPointer(pointer, 'content'), mediaType)),
          },
        ]
      : []
  );

const toServers = (servers: unknown): OperationServer[] | undefined =>
  Array.isArray(servers) && servers.length > 0
    ? servers.filter(isRecord).map(({ url, variables }) => ({
        url: String(url),
        variables: Object.fromEntries(
          entriesOf(variables).flatMap(([name, variable]) =>
            isRecord(variable)
              ? [
                  [
                    name,
                    {
                      default: String(variable.default),
                      enum: Array.isArray(variable.enum) ? variable.enum.map(String) : undefined,
                    },
                  ],
                ]
              : []
          )
        ),
      }))
    : undefined;

const toParameters = (document: OpenApiDocument, parameters: unknown, pointer: string) =>
  (Array.isArray(parameters) ? parameters : []).flatMap((node, index): OperationParameter[] => {
    const { value, pointer: resolved } = resolveObject(
      document,
      node,
      appendPointer(pointer, index)
    );
    if (!isParameterLocation(value.in)) {
      return [];
    }
    const style =
      typeof value.style === 'string'
        ? value.style
        : value.in === 'query' || value.in === 'cookie'
        ? 'form'
        : 'simple';
    return [
      {
        name: String(value.name),
        in: value.in,
        required: value.in === 'path' || value.required === true,
        style,
        explode: typeof value.explode === 'boolean' ? value.explode : style === 'form',
        schema: toSchema(value, resolved),
      },
    ];
  });

const toHeaders = (
  document: OpenApiDocument,
  headers: unknown,
  pointer: string
): OperationHeader[] =>
  entriesOf(headers).map(([name, node]) => {
    const { value, pointer: resolved } = resolveObject(
      document,
      node,
      appendPointer(pointer, name)
    );
    return { name, required: value.required === true, schema: toSchema(value, resolved) };
  });

// Operation parameters override path item parameters with the same name and location.
const mergeParameters = (
  inherited: OperationParameter[],
  own: OperationParameter[]
): OperationParameter[] => [
  ...inherited.filter(
    (parameter) =>
      !own.some(({ name, in: location }) => name === parameter.name && location === parameter.in)
  ),
  ...own,
];

const getDialect = ({ openapi }: OpenApiDocument): ContractSpec['dialect'] => {
  const version = typeof openapi === 'string' ? openapi : '';
  if (version.startsWith('3.0.')) {
    return 'openapi-3.0';
  }
  if (/^3\.[1-9]\d*\./.test(version)) {
    return 'draft-2020-12';
  }
  throw new Error(`Unsupported spec version ${version || 'unknown'}; expected OpenAPI 3.x`);
};

/**
 * Indexes the operations of an OpenAPI 3.x document. Parameter, request body, response and
 * header refs are resolved, while schemas stay in place in a copy of the document, so their
 * refs keep resolving against it and large specs such as Microsoft Graph load quickly.
 */
export const loadOperations = (source: OpenApiDocument): ContractOperation[] => {
  const spec: ContractSpec = { document: structuredClone(source), dialect: getDialect(source) };
  const { document } = spec;
  const rootServers = toServers(document.servers) ?? [];

  return entriesOf(document.paths).flatMap(([path, node]) => {
    const itemPointer = appendPointer('/paths', path);
    const { value: item, pointer: itemResolved } = resolveObject(document, node, itemPointer);
    const itemParameters = toParameters(
      document,
      item.parameters,
      appendPointer(itemResolved, 'parameters')
    );

    return HTTP_METHODS.flatMap((method): ContractOperation[] => {
      const operation = item[method];
      if (!isRecord(operation)) {
        return [];
      }
      const pointer = appendPointer(itemResolved, method);
      const body = isRecord(operation.requestBody)
        ? resolveObject(document, operation.requestBody, appendPointer(pointer, 'requestBody'))
        : undefined;
      return [
        {
          id:
            typeof operation.operationId === 'string'
              ? operation.operationId
              : `${method.toUpperCase()} ${path}`,
          method,
          path,
          servers: toServers(operation.servers) ?? toServers(item.servers) ?? rootServers,
          parameters: mergeParameters(
            itemParameters,
            toParameters(document, operation.parameters, appendPointer(pointer, 'parameters'))
          ),
          requestBody: body && {
            required: body.value.required === true,
            contents: toContents(body.value, body.pointer),
          },
          responses: entriesOf(operation.responses).map(([code, response]) => {
            const resolved = resolveObject(
              document,
              response,
              appendPointer(appendPointer(pointer, 'responses'), code)
            );
            return {
              code,
              contents: toContents(resolved.value, resolved.pointer),
              headers: toHeaders(
                document,
                resolved.value.headers,
                appendPointer(resolved.pointer, 'headers')
              ),
            };
          }),
          spec,
        },
      ];
    });
  });
};
