/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonSchema, OpenApiDocument } from '../openapi/types';
import type {
  FieldType,
  ObjectRef,
  ReferenceEndpoint,
  ReferenceField,
  ReferenceObject,
  ReferenceResponse,
  ReferenceSecurity,
} from './types';

export interface ReferenceServer {
  readonly url: string;
  readonly variables?: Readonly<Record<string, { readonly default: string }>>;
}

export interface ReferenceDocument {
  readonly title: string;
  readonly version: string;
  /** Servers for endpoints whose pages state no base URL, such as a per-customer workspace. */
  readonly servers?: readonly ReferenceServer[];
  readonly endpoints: readonly ReferenceEndpoint[];
  readonly objects: readonly ReferenceObject[];
}

// OpenAPI ignores header parameters with these names; the media types and security schemes
// describe them instead.
const IGNORED_HEADERS = new Set(['accept', 'content-type', 'authorization']);

const PATH_PARAMETER = /\{([^}]+)\}/g;

/** Converts a value as written on a page, such as `20` or `true`, to the field's type. */
const toLiteral = (text: string, type: FieldType): unknown => {
  switch (type.kind) {
    case 'integer':
    case 'number': {
      const number = Number(text);
      return text.trim() !== '' && Number.isFinite(number) ? number : text;
    }
    case 'boolean':
      return text === 'true' ? true : text === 'false' ? false : text;
    case 'string':
      return text;
    default:
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
  }
};

const toProperties = (fields: readonly ReferenceField[]): JsonSchema => {
  const required = fields.filter((field) => field.required).map(({ name }) => name);
  return {
    type: 'object',
    properties: Object.fromEntries(fields.map((field) => [field.name, toFieldSchema(field)])),
    ...(required.length > 0 ? { required } : {}),
  };
};

const toTypeSchema = (type: FieldType, field: ReferenceField): JsonSchema => {
  const { constraints = {} } = field;
  switch (type.kind) {
    case 'array':
      return {
        type: 'array',
        items: toTypeSchema(type.items, field),
        ...(constraints.minItems === undefined ? {} : { minItems: constraints.minItems }),
        ...(constraints.maxItems === undefined ? {} : { maxItems: constraints.maxItems }),
      };
    case 'object':
      return field.children && field.children.length > 0
        ? toProperties(field.children)
        : { type: 'object' };
    case 'any':
      return {};
    case 'string':
      return {
        type: 'string',
        ...(type.format ? { format: type.format } : {}),
        ...(field.enum ? { enum: field.enum.map((value) => toLiteral(value, type)) } : {}),
        ...(constraints.minLength === undefined ? {} : { minLength: constraints.minLength }),
        ...(constraints.maxLength === undefined ? {} : { maxLength: constraints.maxLength }),
        ...(constraints.pattern === undefined ? {} : { pattern: constraints.pattern }),
      };
    default:
      return {
        type: type.kind,
        ...(type.format ? { format: type.format } : {}),
        ...(field.enum ? { enum: field.enum.map((value) => toLiteral(value, type)) } : {}),
        ...(type.kind !== 'boolean' && constraints.minimum !== undefined
          ? {
              minimum: constraints.minimum,
              ...(constraints.exclusiveMinimum ? { exclusiveMinimum: true } : {}),
            }
          : {}),
        ...(type.kind !== 'boolean' && constraints.maximum !== undefined
          ? {
              maximum: constraints.maximum,
              ...(constraints.exclusiveMaximum ? { exclusiveMaximum: true } : {}),
            }
          : {}),
      };
  }
};

/**
 * The schema of a field: its type with the enum and bounds the page lists (on the items, for
 * arrays), its child fields as properties (of the items, for arrays of objects), and its
 * description, default and example.
 */
export const toFieldSchema = (field: ReferenceField): JsonSchema => {
  const schema = toTypeSchema(field.type, field);
  return {
    ...schema,
    ...(field.nullable && schema.type !== undefined ? { nullable: true } : {}),
    ...(field.deprecated ? { deprecated: true } : {}),
    ...(field.description ? { description: field.description } : {}),
    ...(field.default === undefined ? {} : { default: toLiteral(field.default, field.type) }),
    // Pages give an item, not a whole array, as the example of an array field.
    ...(field.example === undefined || field.type.kind === 'array'
      ? {}
      : { example: toLiteral(field.example, field.type) }),
  };
};

const toSecurityScheme = (security: ReferenceSecurity): [string, Record<string, unknown>] =>
  security.type === 'apiKey'
    ? [security.name, { type: 'apiKey', in: security.in, name: security.name }]
    : [`${security.scheme}Auth`, { type: 'http', scheme: security.scheme }];

// `alerts/v1` becomes `AlertsV1`.
const toPascalCase = (scope: string): string =>
  scope
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join('');

/** Component names for object pages: the object's name, prefixed by its scope when shared. */
const nameObjects = (objects: readonly ReferenceObject[]): Map<string, string> => {
  const counts = new Map<string, number>();
  for (const { name } of objects) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return new Map(
    objects.map(({ scope, name }) => [
      `${scope}#${name}`,
      (counts.get(name) ?? 0) > 1 ? `${toPascalCase(scope)}${name}` : name,
    ])
  );
};

/**
 * Builds an OpenAPI 3.0 document from the endpoints and objects parsed from a Markdown API
 * reference. Object pages become component schemas, and responses that refer to an object
 * page reference them. Endpoints that share a method and path keep the first page's version.
 */
export const toOpenApi = ({
  title,
  version,
  servers,
  endpoints,
  objects,
}: ReferenceDocument): OpenApiDocument => {
  const objectNames = nameObjects(objects);
  const toObjectRef = ({ scope, name }: ObjectRef): JsonSchema | undefined => {
    const component = objectNames.get(`${scope}#${name}`);
    return component ? { $ref: `#/components/schemas/${component}` } : undefined;
  };

  const serverUrls = [...new Set(endpoints.flatMap(({ serverUrl }) => serverUrl ?? []))];
  const rootServers: readonly ReferenceServer[] =
    servers ?? (serverUrls.length === 1 ? [{ url: serverUrls[0] }] : []);
  const rootUrls = new Set(rootServers.map(({ url }) => url));

  const toResponse = ({ description, fields, object, example }: ReferenceResponse) => {
    const schema =
      fields && fields.length > 0
        ? toProperties(fields)
        : (object && toObjectRef(object)) ?? (example === undefined ? undefined : {});
    return {
      description: description ?? 'Response',
      ...(schema
        ? {
            content: {
              'application/json': { schema, ...(example === undefined ? {} : { example }) },
            },
          }
        : {}),
    };
  };

  const toOperation = (endpoint: ReferenceEndpoint) => {
    const listed = endpoint.parameters.filter(
      (parameter) => parameter.in !== 'header' || !IGNORED_HEADERS.has(parameter.name.toLowerCase())
    );
    // Path parameters the page leaves out, so requests still match the path.
    const unlisted = [...endpoint.path.matchAll(PATH_PARAMETER)]
      .map(([, name]) => name)
      .filter(
        (name) => !listed.some((parameter) => parameter.in === 'path' && parameter.name === name)
      )
      .map((name) => ({ name, in: 'path', required: true, schema: { type: 'string' } }));
    const responses = endpoint.responses.length > 0 ? endpoint.responses : [{ status: '200' }];
    return {
      ...(endpoint.id ? { operationId: endpoint.id } : {}),
      ...(endpoint.summary ? { summary: endpoint.summary } : {}),
      ...(endpoint.description ? { description: endpoint.description } : {}),
      ...(endpoint.deprecated ? { deprecated: true } : {}),
      ...(endpoint.serverUrl && !rootUrls.has(endpoint.serverUrl)
        ? { servers: [{ url: endpoint.serverUrl }] }
        : {}),
      parameters: [
        ...listed.map(({ in: location, ...field }) => ({
          name: field.name,
          in: location,
          required: location === 'path' || field.required,
          ...(field.description ? { description: field.description } : {}),
          ...(field.deprecated ? { deprecated: true } : {}),
          schema: toFieldSchema({ ...field, description: undefined, deprecated: undefined }),
        })),
        ...unlisted,
      ],
      ...(endpoint.requestBody
        ? {
            requestBody: {
              required: endpoint.requestBody.required,
              content: {
                [endpoint.requestBody.mediaType]: {
                  schema: toProperties(endpoint.requestBody.fields),
                },
              },
            },
          }
        : {}),
      responses: Object.fromEntries(
        responses.map((response) => [response.status, toResponse(response)])
      ),
      ...(endpoint.security.length > 0
        ? {
            security: endpoint.security.map((security) => ({
              [toSecurityScheme(security)[0]]: [],
            })),
          }
        : {}),
    };
  };

  const paths: Record<string, Record<string, unknown>> = {};
  for (const endpoint of endpoints) {
    const item = paths[endpoint.path] ?? {};
    if (!(endpoint.method in item)) {
      paths[endpoint.path] = { ...item, [endpoint.method]: toOperation(endpoint) };
    }
  }

  const securitySchemes = Object.fromEntries(
    endpoints.flatMap(({ security }) => security.map(toSecurityScheme))
  );
  return {
    openapi: '3.0.3',
    info: { title, version },
    ...(rootServers.length > 0 ? { servers: rootServers } : {}),
    paths,
    components: {
      schemas: Object.fromEntries(
        objects.map((object) => [
          objectNames.get(`${object.scope}#${object.name}`),
          {
            ...toProperties(object.fields),
            ...(object.example === undefined ? {} : { example: object.example }),
          },
        ])
      ),
      ...(Object.keys(securitySchemes).length > 0 ? { securitySchemes } : {}),
    },
  };
};
