/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Heavily adapted version of https://github.com/jlalmes/trpc-openapi
 */

import type { OpenAPIV3 } from 'openapi-types';
import z from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

import type { CoreVersionedRouter } from '@kbn/core-http-router-server-internal';
import { versionHandlerResolvers } from '@kbn/core-http-router-server-internal';
import type { VersionedRouterRoute } from '@kbn/core-http-router-server-internal/src/versioned_router/types';
import {
  instanceofZodType,
  instanceofZodTypeObject,
  instanceofZodTypeLikeVoid,
  instanceofZodTypeLikeString,
  instanceofZodTypeOptional,
  unwrapZodType,
  zodSupportsCoerce,
  instanceofZodTypeCoercible,
  getPathParameters,
} from './util';

export const openApiVersion = '3.0.0';

export interface GenerateOpenApiDocumentOptions {
  title: string;
  description?: string;
  version: string;
  baseUrl: string;
  docsUrl?: string;
  tags?: string[];
}

export function generateOpenApiDocument(
  appRouters: any[],
  opts: GenerateOpenApiDocumentOptions
): OpenAPIV3.Document {
  const paths: OpenAPIV3.PathsObject = {};
  for (const appRouter of appRouters) {
    Object.assign(paths, getOpenApiPathsObject(appRouter));
  }
  return {
    openapi: openApiVersion,
    info: {
      title: opts.title,
      description: opts.description,
      version: opts.version,
    },
    servers: [
      {
        url: opts.baseUrl,
      },
    ],
    paths,
    security: [
      {
        basicAuth: [],
      },
      {
        apiKeyAuth: [],
      },
    ],
    tags: opts.tags?.map((tag) => ({ name: tag })),
    externalDocs: opts.docsUrl ? { url: opts.docsUrl } : undefined,
  };
}

/* For this PoC we assume that we are able to get JSONSchema from our runtime validation types */
function runtimeSchemaToJsonSchema(schema: z.ZodTypeAny): OpenAPIV3.SchemaObject {
  return zodToJsonSchema(schema, { target: 'openApi3', $refStrategy: 'none' }) as any;
}

function getVersionedContentString(version: string): string {
  return `application/json; Elastic-Api-Version=${version}`;
}

function extractParameterObjects(
  schema: unknown,
  pathParameters: string[],
  inType: 'path' | 'query'
): OpenAPIV3.ParameterObject[] | undefined {
  if (!instanceofZodType(schema)) {
    throw new Error('Zod validator expected');
  }

  const isRequired = !schema.isOptional();
  const unwrappedSchema = unwrapZodType(schema, true);

  if (pathParameters.length === 0 && instanceofZodTypeLikeVoid(unwrappedSchema)) {
    return undefined;
  }

  if (!instanceofZodTypeObject(unwrappedSchema)) {
    throw new Error('Input parser must be a ZodObject');
  }

  const shape = unwrappedSchema.shape;
  const shapeKeys = Object.keys(shape);

  for (const pathParameter of pathParameters) {
    if (!shapeKeys.includes(pathParameter)) {
      throw new Error(`Input parser expects key from path: "${pathParameter}"`);
    }
  }

  return shapeKeys
    .filter((shapeKey) => {
      const isPathParameter = pathParameters.includes(shapeKey);
      if (inType === 'path') {
        return isPathParameter;
      } else if (inType === 'query') {
        return !isPathParameter;
      }
      return true;
    })
    .map((shapeKey) => {
      let shapeSchema = shape[shapeKey]!;
      const isShapeRequired = !shapeSchema.isOptional();
      const isPathParameter = pathParameters.includes(shapeKey);

      if (!instanceofZodTypeLikeString(shapeSchema)) {
        if (zodSupportsCoerce) {
          if (!instanceofZodTypeCoercible(shapeSchema)) {
            throw new Error(
              `Input parser key: "${shapeKey}" must be ZodString, ZodNumber, ZodBoolean, ZodBigInt or ZodDate`
            );
          }
        } else {
          throw new Error(`Input parser key: "${shapeKey}" must be ZodString`);
        }
      }

      if (instanceofZodTypeOptional(shapeSchema)) {
        if (isPathParameter) {
          throw new Error(`Path parameter: "${shapeKey}" must not be optional`);
        }
        shapeSchema = shapeSchema.unwrap();
      }

      const { description, ...openApiSchemaObject } = runtimeSchemaToJsonSchema(shapeSchema);

      return {
        name: shapeKey,
        in: isPathParameter ? 'path' : 'query',
        required: isPathParameter || (isRequired && isShapeRequired),
        schema: openApiSchemaObject,
        description,
      };
    });
}

function extractRequestBody(route: VersionedRouterRoute): OpenAPIV3.RequestBodyObject['content'] {
  return route.handlers.reduce<OpenAPIV3.RequestBodyObject['content']>((acc, handler) => {
    if (!handler.options.validate) return acc;
    if (!handler.options.validate.request) return acc;
    const schema = instanceofZodType(handler.options.validate.request.body)
      ? runtimeSchemaToJsonSchema(handler.options.validate.request.body)
      : {};
    return {
      ...acc,
      [getVersionedContentString(handler.options.version)]: {
        schema,
      },
    };
  }, {} as OpenAPIV3.RequestBodyObject['content']);
}

function extractResponses(route: VersionedRouterRoute): OpenAPIV3.ResponsesObject {
  return route.handlers.reduce<OpenAPIV3.ResponsesObject>((acc, handler) => {
    if (!handler.options.validate) return acc;
    if (!handler.options.validate.response) return acc;
    const statusCodes = Object.keys(handler.options.validate.response);
    for (const statusCode of statusCodes) {
      const maybeSchema = handler.options.validate.response[statusCode as unknown as number].body;
      const schema = instanceofZodType(maybeSchema) ? runtimeSchemaToJsonSchema(maybeSchema) : {};
      acc[statusCode] = {
        ...acc[statusCode],
        description: route.options.description ?? 'No description',
        content: {
          ...((acc[statusCode] ?? {}) as OpenAPIV3.ResponseObject).content,
          [getVersionedContentString(handler.options.version)]: {
            schema,
          },
        },
      };
    }
    return acc;
  }, {});
}

const operationIdCounters = new Map<string, number>();
function getOperationId(name: string): string {
  // Aliases an operationId to ensure it is unique across
  // multiple method+path combinations sharing a name.
  // "search" -> "search#0", "search#1", etc.
  const operationIdCount = operationIdCounters.get(name) ?? 0;
  const aliasedName = name + '#' + operationIdCount.toString();
  operationIdCounters.set(name, operationIdCount + 1);
  return aliasedName;
}

function getOpenApiPathsObject(appRouter: CoreVersionedRouter): OpenAPIV3.PathsObject {
  const routes = appRouter
    .getRoutes()
    .filter((route) => route.options.access === 'public')
    .map((route) => ({
      ...route,
      path: route.path.replace('?', ''),
    }));
  const paths: OpenAPIV3.PathsObject = {};
  for (const route of routes) {
    const pathParams = getPathParameters(route.path);
    const hasBody = route.handlers.some(
      (handler) => handler.options.validate !== false && handler.options.validate?.request?.body
    );

    /**
     * Note: for a given route we accept that route params and query params remain BWC
     *       so we only take the latest version of the params and query params, we also
     *       assume at this point that we are generating for serverless.
     */
    let pathObjects: OpenAPIV3.ParameterObject[] = [];
    let queryObjects: OpenAPIV3.ParameterObject[] = [];
    const version = versionHandlerResolvers.newest(
      route.handlers.map(({ options: { version: v } }) => v)
    );
    const handler = route.handlers.find(({ options: { version: v } }) => v === version);
    if (handler && handler.options.validate !== false) {
      const params = handler.options.validate.request?.params as any;
      if (params && instanceofZodType(params)) {
        pathObjects = extractParameterObjects(params, pathParams, 'path') ?? [];
      }
      const query = handler.options.validate.request?.query as any;
      if (query && instanceofZodType(query)) {
        queryObjects = extractParameterObjects(query, pathParams, 'query') ?? [];
      }
    }

    const path: OpenAPIV3.PathItemObject = {
      [route.method]: {
        requestBody: hasBody
          ? {
              content: extractRequestBody(route),
            }
          : undefined,
        responses: extractResponses(route),
        parameters: pathObjects.concat(queryObjects),
        operationId: getOperationId(route.path),
      },
    };

    paths[route.path] = { ...paths[route.path], ...path };
  }
  return paths;
}
