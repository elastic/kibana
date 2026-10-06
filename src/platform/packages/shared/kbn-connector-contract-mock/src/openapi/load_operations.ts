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
  OperationParameter,
  OperationServer,
  ParameterLocation,
  SpecSchema,
} from './types';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace', 'query'];

// `querystring` parameters are described by `content`, to which `style` does not apply.
const DEFAULT_STYLES: Readonly<Record<ParameterLocation, string>> = {
  path: 'simple',
  query: 'form',
  querystring: 'form',
  header: 'simple',
  cookie: 'form',
};

const isParameterLocation = (value: unknown): value is ParameterLocation =>
  typeof value === 'string' && value in DEFAULT_STYLES;

const entriesOf = (value: unknown): Array<[string, unknown]> =>
  isRecord(value) ? Object.entries(value) : [];

// Paths and Responses objects allow `x-` specification extensions among their keys, unlike
// maps keyed by names such as headers and server variables, where `x-rate-limit` is a name.
const extensibleEntriesOf = (value: unknown): Array<[string, unknown]> =>
  entriesOf(value).filter(([key]) => !key.startsWith('x-'));

const toSchema = (owner: Record<string, unknown>, pointer: string): SpecSchema | undefined => {
  const { schema } = owner;
  return isRecord(schema) || typeof schema === 'boolean'
    ? { pointer: appendPointer(pointer, 'schema'), schema }
    : undefined;
};

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
      const [content] = toContents(value, resolved);
      return [
        {
          name: String(value.name),
          in: value.in,
          required,
          style,
          explode,
          schema: toSchema(value, resolved),
          content,
        },
      ];
    });

  // A Path Item `$ref` may have sibling fields; those take precedence over the referenced item.
  const toPathItemFields = (node: unknown, pointer: string) => {
    const local = isRecord(node) ? node : {};
    const referenced = typeof local.$ref === 'string' ? resolve(node, pointer) : undefined;
    return (field: string): { value: unknown; pointer: string } =>
      field in local || !referenced
        ? { value: local[field], pointer: appendPointer(pointer, field) }
        : { value: referenced.value[field], pointer: appendPointer(referenced.pointer, field) };
  };

  return extensibleEntriesOf(document.paths).flatMap(([path, node]) => {
    const field = toPathItemFields(node, appendPointer('/paths', path));
    const itemParameters = field('parameters');
    const inheritedParameters = toParameters(itemParameters.value, itemParameters.pointer);
    const itemServers = toServers(field('servers').value);
    const additional = field('additionalOperations');

    const operations = [
      ...HTTP_METHODS.map((method) => ({ method, ...field(method) })),
      ...entriesOf(additional.value).map(([method, value]) => ({
        method: method.toLowerCase(),
        value,
        pointer: appendPointer(additional.pointer, method),
      })),
    ];

    return operations.flatMap(({ method, value: operation, pointer }): ContractOperation[] => {
      if (!isRecord(operation)) {
        return [];
      }
      const ownParameters = toParameters(
        operation.parameters,
        appendPointer(pointer, 'parameters')
      );
      // Operation parameters override path item parameters with the same name and location.
      const inherited = inheritedParameters.filter(
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
          servers: toServers(operation.servers) ?? itemServers ?? rootServers,
          parameters: [...inherited, ...ownParameters],
          requestBody: body && {
            required: body.value.required === true,
            contents: toContents(body.value, body.pointer),
          },
          responses: extensibleEntriesOf(operation.responses).map(([code, response]) => {
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
