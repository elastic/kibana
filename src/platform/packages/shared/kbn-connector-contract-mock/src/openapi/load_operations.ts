/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertSwagger2 } from './convert_swagger2';
import { appendPointer, resolveObject } from './json_pointer';
import { isRecord } from './schema_walk';
import type {
  ContractOperation,
  ContractSpec,
  MediaTypeContent,
  OpenApiDocument,
  OperationParameter,
  OperationServer,
  ParameterLocation,
  SpecSchema,
} from './types';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

const DEFAULT_STYLES: Readonly<Record<ParameterLocation, string>> = {
  path: 'simple',
  query: 'form',
  header: 'simple',
  cookie: 'form',
};

const isParameterLocation = (value: unknown): value is ParameterLocation =>
  typeof value === 'string' && value in DEFAULT_STYLES;

// Skips `x-` specification extensions, which may appear among paths and responses.
const entriesOf = (value: unknown): Array<[string, unknown]> =>
  isRecord(value) ? Object.entries(value).filter(([key]) => !key.startsWith('x-')) : [];

const toSchema = (owner: Record<string, unknown>, pointer: string): SpecSchema | undefined =>
  isRecord(owner.schema)
    ? { pointer: appendPointer(pointer, 'schema'), schema: owner.schema }
    : undefined;

const toContents = (owner: Record<string, unknown>, pointer: string): MediaTypeContent[] =>
  entriesOf(owner.content).map(([mediaType, content]) => ({
    mediaType,
    schema: isRecord(content)
      ? toSchema(content, appendPointer(pointer, 'content', mediaType))
      : undefined,
  }));

const toServers = (servers: unknown): OperationServer[] | undefined => {
  if (!Array.isArray(servers) || servers.length === 0) {
    return undefined;
  }
  return servers.filter(isRecord).map(({ url, variables }) => ({
    url: String(url),
    variables: Object.fromEntries(
      entriesOf(variables).map(([name, variable]) => {
        const { default: fallback, enum: values } = isRecord(variable) ? variable : {};
        return [
          name,
          {
            default: String(fallback),
            enum: Array.isArray(values) ? values.map(String) : undefined,
          },
        ];
      })
    ),
  }));
};

const getDialect = ({ openapi }: OpenApiDocument): ContractSpec['dialect'] => {
  const version = typeof openapi === 'string' ? openapi : '';
  if (version.startsWith('3.0.')) {
    return 'openapi-3.0';
  }
  if (/^3\.[1-9]\d*\./.test(version)) {
    return 'draft-2020-12';
  }
  throw new Error(
    `Unsupported spec version ${version || 'unknown'}; expected Swagger 2.0 or OpenAPI 3.x`
  );
};

/**
 * Indexes the operations of an OpenAPI 3.x document, converting Swagger 2.0 documents first.
 * Parameter, request body, response and header refs are resolved, while schemas stay in place
 * in a copy of the document, so their refs keep resolving against it and large specs such as
 * Microsoft Graph load quickly.
 */
export const loadOperations = (source: OpenApiDocument): ContractOperation[] => {
  const openApi = source.swagger === '2.0' ? convertSwagger2(source) : structuredClone(source);
  const spec: ContractSpec = { document: openApi, dialect: getDialect(openApi) };
  const { document } = spec;
  const resolve = (node: unknown, pointer: string) => resolveObject(document, node, pointer);
  const rootServers = toServers(document.servers) ?? [];

  const toParameters = (parameters: unknown, pointer: string): OperationParameter[] =>
    (Array.isArray(parameters) ? parameters : []).flatMap((node, index) => {
      const { value, pointer: resolved } = resolve(node, appendPointer(pointer, index));
      if (!isParameterLocation(value.in)) {
        return [];
      }
      const style = typeof value.style === 'string' ? value.style : DEFAULT_STYLES[value.in];
      const explode = typeof value.explode === 'boolean' ? value.explode : style === 'form';
      const required = value.in === 'path' || value.required === true;
      return [
        {
          name: String(value.name),
          in: value.in,
          required,
          style,
          explode,
          schema: toSchema(value, resolved),
        },
      ];
    });

  return entriesOf(document.paths).flatMap(([path, node]) => {
    const { value: item, pointer: itemPointer } = resolve(node, appendPointer('/paths', path));
    const itemParameters = toParameters(item.parameters, appendPointer(itemPointer, 'parameters'));

    return HTTP_METHODS.flatMap((method): ContractOperation[] => {
      const operation = item[method];
      if (!isRecord(operation)) {
        return [];
      }
      const pointer = appendPointer(itemPointer, method);
      const ownParameters = toParameters(
        operation.parameters,
        appendPointer(pointer, 'parameters')
      );
      // Operation parameters override path item parameters with the same name and location.
      const inherited = itemParameters.filter(
        ({ name, in: location }) =>
          !ownParameters.some((own) => own.name === name && own.in === location)
      );
      const body = isRecord(operation.requestBody)
        ? resolve(operation.requestBody, appendPointer(pointer, 'requestBody'))
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
          parameters: [...inherited, ...ownParameters],
          requestBody: body && {
            required: body.value.required === true,
            contents: toContents(body.value, body.pointer),
          },
          responses: entriesOf(operation.responses).map(([code, response]) => {
            const { value, pointer: resolved } = resolve(
              response,
              appendPointer(pointer, 'responses', code)
            );
            return {
              code,
              contents: toContents(value, resolved),
              headers: entriesOf(value.headers).map(([name, header]) => {
                const target = resolve(header, appendPointer(resolved, 'headers', name));
                return {
                  name,
                  required: target.value.required === true,
                  schema: toSchema(target.value, target.pointer),
                };
              }),
            };
          }),
          spec,
        },
      ];
    });
  });
};
