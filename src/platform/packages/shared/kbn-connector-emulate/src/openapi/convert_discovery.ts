/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRecord } from './schema_walk';
import type { JsonSchema, OpenApiDocument } from './types';

type Node = Record<string, unknown>;

const OAUTH2 = 'Oauth2';
const AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Discovery schema keywords that mean the same in OpenAPI 3.0 schemas.
const SHARED_KEYWORDS = ['type', 'format', 'enum', 'default', 'pattern', 'readOnly', 'deprecated'];

const asRecord = (value: unknown): Node => (isRecord(value) ? value : {});

const toNumber = (value: unknown): number | undefined => {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : undefined;
};

/** Whether a parsed document is a Google API Discovery document (`discovery#restDescription`). */
export const isDiscoveryDocument = (document: unknown): boolean =>
  isRecord(document) && document.kind === 'discovery#restDescription';

/**
 * Converts a Discovery schema: `$ref`s name a schema, `type: any` allows anything, and
 * properties are required with a `required: true` of their own, as in JSON Schema draft 3.
 */
const toSchema = (node: Node): JsonSchema => {
  if (typeof node.$ref === 'string') {
    return { $ref: `#/components/schemas/${node.$ref}` };
  }
  const schema: JsonSchema = {};
  for (const keyword of SHARED_KEYWORDS) {
    if (node[keyword] !== undefined && !(keyword === 'type' && node.type === 'any')) {
      schema[keyword] = node[keyword];
    }
  }
  const minimum = toNumber(node.minimum);
  const maximum = toNumber(node.maximum);
  if (minimum !== undefined) {
    schema.minimum = minimum;
  }
  if (maximum !== undefined) {
    schema.maximum = maximum;
  }
  if (isRecord(node.items)) {
    schema.items = toSchema(node.items);
  }
  if (isRecord(node.additionalProperties)) {
    schema.additionalProperties = toSchema(node.additionalProperties);
  }
  if (isRecord(node.properties)) {
    const properties = Object.entries(node.properties).filter((entry): entry is [string, Node] =>
      isRecord(entry[1])
    );
    schema.properties = Object.fromEntries(
      properties.map(([name, property]) => [name, toSchema(property)])
    );
    const required = properties.filter(([, property]) => property.required === true);
    if (required.length > 0) {
      schema.required = required.map(([name]) => name);
    }
  }
  return schema;
};

const toParameter = (name: string, node: Node) => {
  const schema = toSchema(node);
  return {
    name,
    in: node.location === 'path' ? 'path' : 'query',
    ...(node.required === true || node.location === 'path' ? { required: true } : {}),
    ...(node.deprecated === true ? { deprecated: true } : {}),
    schema: node.repeated === true ? { type: 'array', items: schema } : schema,
  };
};

const PLACEHOLDER = /\{\+?([^}]+)\}/g;

/**
 * The method's OpenAPI path. `flatPath` spells out what reserved expansions such as
 * `v1/{+name}` stand for (`v1/projects/{projectsId}/secrets/{secretsId}`); OpenAPI path
 * parameters can't contain slashes, so only it matches requests.
 */
const toPath = (method: Node): string => {
  const template = typeof method.flatPath === 'string' ? method.flatPath : String(method.path);
  const path = template.replace(PLACEHOLDER, (_, name: string) => `{${name}}`);
  return path.startsWith('/') ? path : `/${path}`;
};

const toOperation = (method: Node, path: string, globalParameters: Node) => {
  const placeholders = [...path.matchAll(PLACEHOLDER)].map(([, name]) => name);
  const declared = asRecord(method.parameters);
  const pathParameters = placeholders.map((name) =>
    toParameter(
      name,
      isRecord(declared[name]) ? declared[name] : { type: 'string', location: 'path' }
    )
  );
  const queryParameters = Object.entries({ ...globalParameters, ...declared })
    .filter((entry): entry is [string, Node] => isRecord(entry[1]) && entry[1].location !== 'path')
    .map(([name, node]) => toParameter(name, node));
  const request = asRecord(method.request);
  const response = asRecord(method.response);
  const scopes = Array.isArray(method.scopes) ? method.scopes.map(String) : [];
  return {
    ...(typeof method.id === 'string' ? { operationId: method.id } : {}),
    ...(method.deprecated === true ? { deprecated: true } : {}),
    parameters: [...pathParameters, ...queryParameters],
    ...(typeof request.$ref === 'string'
      ? { requestBody: { content: { 'application/json': { schema: toSchema(request) } } } }
      : {}),
    responses:
      typeof response.$ref === 'string'
        ? {
            '200': {
              description: 'Successful response',
              content: { 'application/json': { schema: toSchema(response) } },
            },
          }
        : { '2XX': { description: 'Successful response' } },
    ...(scopes.length > 0 ? { security: [{ [OAUTH2]: scopes }] } : {}),
  };
};

/** The simple media upload variant of a method, served from the root URL. */
const toUploadOperation = (method: Node, operation: ReturnType<typeof toOperation>) => {
  const mediaUpload = asRecord(method.mediaUpload);
  const simple = asRecord(asRecord(mediaUpload.protocols).simple);
  if (method.supportsMediaUpload !== true || typeof simple.path !== 'string') {
    return undefined;
  }
  const accept = Array.isArray(mediaUpload.accept) ? mediaUpload.accept.map(String) : ['*/*'];
  const binary = { schema: { type: 'string', format: 'binary' } };
  return {
    path: simple.path.replace(PLACEHOLDER, (_, name: string) => `{${name}}`),
    operation: {
      ...operation,
      ...(typeof method.id === 'string' ? { operationId: `${method.id}.upload` } : {}),
      requestBody: {
        content: Object.fromEntries(
          [...accept, 'multipart/related'].map((mediaType) => [mediaType, binary])
        ),
      },
    },
  };
};

const collectMethods = (resource: Node): Node[] => [
  ...Object.values(asRecord(resource.methods)).filter(isRecord),
  ...Object.values(asRecord(resource.resources)).filter(isRecord).flatMap(collectMethods),
];

/**
 * Converts a Google API Discovery document to OpenAPI 3.0: each method becomes an operation at
 * its flat path under `rootUrl` + `servicePath`, with the API-wide parameters added to its own,
 * its request and response schemas as JSON bodies, and its OAuth scopes as security
 * requirements. Simple media uploads become operations of their own, served from `rootUrl`.
 */
export const convertDiscovery = (document: Node): OpenApiDocument => {
  const rootUrl = String(document.rootUrl ?? document.baseUrl ?? '/');
  const servicePath = typeof document.servicePath === 'string' ? document.servicePath : '';
  const globalParameters = asRecord(document.parameters);
  const uploadServers = [{ url: rootUrl.replace(/\/+$/, '') }];

  const paths: Record<string, Node> = {};
  const addOperation = (path: string, httpMethod: string, operation: Node) => {
    paths[path] = { ...paths[path], [httpMethod]: operation };
  };
  for (const method of collectMethods(document)) {
    const httpMethod = String(method.httpMethod ?? 'GET').toLowerCase();
    const path = toPath(method);
    const operation = toOperation(method, path, globalParameters);
    addOperation(path, httpMethod, operation);
    const upload = toUploadOperation(method, operation);
    if (upload) {
      addOperation(upload.path, httpMethod, { ...upload.operation, servers: uploadServers });
    }
  }

  const scopes = asRecord(asRecord(asRecord(document.auth).oauth2).scopes);
  return {
    openapi: '3.0.3',
    info: {
      title: String(document.title ?? document.name ?? 'Google API'),
      ...(typeof document.version === 'string' ? { version: document.version } : {}),
    },
    servers: [{ url: `${rootUrl}${servicePath}`.replace(/\/+$/, '') }],
    paths,
    components: {
      schemas: Object.fromEntries(
        Object.entries(asRecord(document.schemas))
          .filter((entry): entry is [string, Node] => isRecord(entry[1]))
          .map(([name, schema]) => [name, toSchema(schema)])
      ),
      ...(Object.keys(scopes).length > 0
        ? {
            securitySchemes: {
              [OAUTH2]: {
                type: 'oauth2',
                flows: {
                  authorizationCode: {
                    authorizationUrl: AUTHORIZATION_URL,
                    tokenUrl: TOKEN_URL,
                    scopes: Object.fromEntries(
                      Object.entries(scopes).map(([scope, node]) => [
                        scope,
                        String(asRecord(node).description ?? ''),
                      ])
                    ),
                  },
                },
              },
            },
          }
        : {}),
    },
  };
};
