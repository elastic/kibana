/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { resolveObject } from './json_pointer';
import { isRecord } from './schema_walk';
import type { JsonSchema, OpenApiDocument } from './types';

type Node = Record<string, unknown>;

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

// Keywords that Swagger 2.0 puts directly on non-body parameters, items and headers.
const SCHEMA_KEYWORDS = [
  'type',
  'format',
  'items',
  'default',
  'enum',
  'maximum',
  'exclusiveMaximum',
  'minimum',
  'exclusiveMinimum',
  'maxLength',
  'minLength',
  'pattern',
  'maxItems',
  'minItems',
  'uniqueItems',
  'multipleOf',
];

const COLLECTION_STYLES: Readonly<Record<string, { style?: string; explode: boolean }>> = {
  csv: { explode: false },
  ssv: { style: 'spaceDelimited', explode: false },
  tsv: { style: 'tabDelimited', explode: false },
  pipes: { style: 'pipeDelimited', explode: false },
  multi: { style: 'form', explode: true },
};

const FORM_MEDIA_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data'];

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asStrings = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.length > 0 ? value.map(String) : undefined;

const toSchema = (node: Node): JsonSchema => {
  const schema: JsonSchema = {};
  for (const keyword of SCHEMA_KEYWORDS) {
    if (node[keyword] !== undefined) {
      schema[keyword] =
        keyword === 'items' && isRecord(node.items) ? toSchema(node.items) : node[keyword];
    }
  }
  return schema;
};

// Rewrites schema refs and the schema keywords that differ between Swagger 2.0 and OpenAPI 3.0.
const convertSchemas = (node: unknown, seen = new WeakSet<object>()): void => {
  if (typeof node !== 'object' || node === null || seen.has(node)) {
    return;
  }
  seen.add(node);
  if (isRecord(node)) {
    if (typeof node.$ref === 'string') {
      node.$ref = node.$ref.replace(/^#\/definitions\//, '#/components/schemas/');
    }
    if (node['x-nullable'] === true) {
      node.nullable = true;
    }
    if (node.type === 'file') {
      Object.assign(node, { type: 'string', format: 'binary' });
    }
    if (typeof node.discriminator === 'string') {
      node.discriminator = { propertyName: node.discriminator };
    }
  }
  for (const child of Array.isArray(node) ? node : Object.values(node)) {
    convertSchemas(child, seen);
  }
};

const toParameter = (parameter: Node): Node => {
  const { name, in: location, required, description, collectionFormat } = parameter;
  const serialization =
    parameter.type === 'array' ? COLLECTION_STYLES[String(collectionFormat ?? 'csv')] : undefined;
  return {
    name,
    in: location,
    required,
    description,
    ...(parameter['x-ms-skip-url-encoding'] === undefined
      ? {}
      : { 'x-ms-skip-url-encoding': parameter['x-ms-skip-url-encoding'] }),
    schema: toSchema(parameter),
    ...(serialization && (location === 'query' || serialization.style === undefined)
      ? { style: serialization.style, explode: serialization.explode }
      : {}),
  };
};

// Swagger 2.0 response `examples` map media types to example values.
const toContent = (mediaTypes: readonly string[], schema: unknown, examples?: unknown): Node =>
  Object.fromEntries(
    mediaTypes.map((mediaType) => {
      const example = isRecord(examples) ? examples[mediaType] : undefined;
      return [
        mediaType,
        {
          ...(isRecord(schema) ? { schema } : {}),
          ...(example === undefined ? {} : { example }),
        },
      ];
    })
  );

// Swagger 2.0 sends form fields as `formData` parameters; OpenAPI 3.0 as one object schema.
const toFormBody = (fields: readonly Node[], consumes: readonly string[]): Node => {
  const declared = consumes.filter((mediaType) => FORM_MEDIA_TYPES.includes(mediaType));
  const hasFile = fields.some(({ type }) => type === 'file');
  const mediaTypes = declared.length > 0 ? declared : [FORM_MEDIA_TYPES[hasFile ? 1 : 0]];
  const required = fields
    .filter((field) => field.required === true)
    .map(({ name }) => String(name));
  return {
    required: required.length > 0,
    content: toContent(mediaTypes, {
      type: 'object',
      properties: Object.fromEntries(fields.map((field) => [String(field.name), toSchema(field)])),
      ...(required.length > 0 ? { required } : {}),
    }),
  };
};

const toResponse = (response: Node, produces: readonly string[]): Node => ({
  description: response.description ?? '',
  ...(response.schema === undefined
    ? {}
    : { content: toContent(produces, response.schema, response.examples) }),
  ...(isRecord(response.headers)
    ? {
        headers: Object.fromEntries(
          Object.entries(response.headers).map(([name, header]) => [
            name,
            { schema: isRecord(header) ? toSchema(header) : {} },
          ])
        ),
      }
    : {}),
});

const OAUTH2_FLOWS: Readonly<Record<string, string>> = {
  implicit: 'implicit',
  password: 'password',
  application: 'clientCredentials',
  accessCode: 'authorizationCode',
};

const toSecuritySchemes = (definitions: unknown): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(isRecord(definitions) ? definitions : {}).flatMap(([name, definition]) => {
      if (!isRecord(definition)) {
        return [];
      }
      const { type, flow, authorizationUrl, tokenUrl, scopes, description } = definition;
      const described = typeof description === 'string' ? { description } : {};
      if (type === 'basic') {
        return [[name, { type: 'http', scheme: 'basic', ...described }]];
      }
      if (type === 'oauth2' && typeof flow === 'string' && flow in OAUTH2_FLOWS) {
        const urls = { authorizationUrl, tokenUrl };
        const flowUrls = Object.fromEntries(
          Object.entries(urls).filter(([, url]) => typeof url === 'string')
        );
        const flows = {
          [OAUTH2_FLOWS[flow]]: { ...flowUrls, scopes: isRecord(scopes) ? scopes : {} },
        };
        return [[name, { type, flows, ...described }]];
      }
      return [[name, definition]];
    })
  );

/**
 * Converts a Swagger 2.0 document to OpenAPI 3.0, so it can be loaded like any other spec.
 * Parameter and response refs are inlined; schema refs keep pointing at the converted
 * `components.schemas`, and security definitions become `components.securitySchemes`.
 */
export const convertSwagger2 = (source: OpenApiDocument): OpenApiDocument => {
  const document = structuredClone(source);
  const resolve = (node: unknown) => resolveObject(document, node, '').value;
  const rootProduces = asStrings(document.produces) ?? ['application/json'];
  const rootConsumes = asStrings(document.consumes) ?? ['application/json'];
  const basePath =
    typeof document.basePath === 'string' ? document.basePath.replace(/\/+$/, '') : '';
  const servers =
    typeof document.host === 'string'
      ? (asStrings(document.schemes) ?? ['https']).map((scheme) => ({
          url: `${scheme}://${document.host}${basePath}`,
        }))
      : [{ url: basePath || '/' }];

  const paths = Object.fromEntries(
    Object.entries(isRecord(document.paths) ? document.paths : {}).map(([path, itemNode]) => {
      const item = resolve(itemNode);
      const itemParameters = asArray(item.parameters).map(resolve);
      const operations = HTTP_METHODS.flatMap((method) => {
        const operation = item[method];
        if (!isRecord(operation)) {
          return [];
        }
        const own = asArray(operation.parameters).map(resolve);
        const parameters = [
          ...itemParameters.filter(
            (inherited) =>
              !own.some(
                ({ name, in: location }) => name === inherited.name && location === inherited.in
              )
          ),
          ...own,
        ];
        const produces = asStrings(operation.produces) ?? rootProduces;
        const consumes = asStrings(operation.consumes) ?? rootConsumes;
        const body = parameters.find((parameter) => parameter.in === 'body');
        const fields = parameters.filter((parameter) => parameter.in === 'formData');
        const requestBody = body
          ? { required: body.required === true, content: toContent(consumes, body.schema) }
          : fields.length > 0
          ? toFormBody(fields, consumes)
          : undefined;
        const { responses } = operation;
        return [
          [
            method,
            {
              ...omit(operation, ['parameters', 'produces', 'consumes', 'responses']),
              parameters: parameters
                .filter(({ in: location }) => location !== 'body' && location !== 'formData')
                .map(toParameter),
              ...(requestBody ? { requestBody } : {}),
              responses: Object.fromEntries(
                Object.entries(isRecord(responses) ? responses : {}).map(([code, response]) => [
                  code,
                  code.startsWith('x-') ? response : toResponse(resolve(response), produces),
                ])
              ),
            },
          ],
        ];
      });
      return [path, Object.fromEntries(operations)];
    })
  );

  const converted: OpenApiDocument = {
    openapi: '3.0.3',
    info: document.info,
    servers,
    paths,
    components: {
      schemas: isRecord(document.definitions) ? document.definitions : {},
      securitySchemes: toSecuritySchemes(document.securityDefinitions),
    },
    ...(Array.isArray(document.security) ? { security: document.security } : {}),
  };
  convertSchemas(converted);
  return converted;
};
