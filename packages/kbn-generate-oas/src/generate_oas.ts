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

import type { CoreVersionedRouter } from '@kbn/core-http-router-server-internal';
import { versionHandlerResolvers } from '@kbn/core-http-router-server-internal';
import { VersionedRouterRoute } from '@kbn/core-http-router-server-internal/src/versioned_router/types';
import {
  getPathParameters,
  extractValidationSchemaFromHandler,
  getVersionedContentString,
} from './util';

import { catchAllConverter, zodConverter } from './oas_converters';
import type { OpenAPIConverter } from './type';

const converters: OpenAPIConverter[] = [zodConverter, catchAllConverter];
const getConverter = (schema: unknown): OpenAPIConverter => {
  return converters.find((c) => c.is(schema))!;
};

export const openApiVersion = '3.0.0';

export interface GenerateOpenApiDocumentOptions {
  title: string;
  description?: string;
  version: string;
  baseUrl: string;
  docsUrl?: string;
  tags?: string[];
}

export const generateOpenApiDocument = (
  appRouters: CoreVersionedRouter[],
  opts: GenerateOpenApiDocumentOptions
): OpenAPIV3.Document => {
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
};

const operationIdCounters = new Map<string, number>();
const getOperationId = (name: string): string => {
  // Aliases an operationId to ensure it is unique across
  // multiple method+path combinations sharing a name.
  // "search" -> "search#0", "search#1", etc.
  const operationIdCount = operationIdCounters.get(name) ?? 0;
  const aliasedName = name + '#' + operationIdCount.toString();
  operationIdCounters.set(name, operationIdCount + 1);
  return aliasedName;
};

const extractRequestBody = (
  route: VersionedRouterRoute
): OpenAPIV3.RequestBodyObject['content'] => {
  return route.handlers.reduce<OpenAPIV3.RequestBodyObject['content']>((acc, handler) => {
    const schemas = extractValidationSchemaFromHandler(handler);
    if (!schemas?.request) return acc;
    const converter = getConverter(schemas.request.body);
    const schema = converter.convert(schemas.request.body);
    return {
      ...acc,
      [getVersionedContentString(handler.options.version)]: {
        schema,
      },
    };
  }, {} as OpenAPIV3.RequestBodyObject['content']);
};
const extractResponses = (route: VersionedRouterRoute): OpenAPIV3.ResponsesObject => {
  return route.handlers.reduce<OpenAPIV3.ResponsesObject>((acc, handler) => {
    const schemas = extractValidationSchemaFromHandler(handler);
    if (!schemas?.response) return acc;
    const statusCodes = Object.keys(schemas.response);
    for (const statusCode of statusCodes) {
      const maybeSchema = schemas.response[statusCode as unknown as number].body;
      const converter = getConverter(maybeSchema);
      const schema = converter.convert(maybeSchema);
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
};

const getOpenApiPathsObject = (appRouter: CoreVersionedRouter): OpenAPIV3.PathsObject => {
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
      (handler) => extractValidationSchemaFromHandler(handler)?.request?.body
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
    const schemas = handler ? extractValidationSchemaFromHandler(handler) : undefined;
    if (handler && schemas) {
      const params = schemas.request?.params as any;
      if (params) {
        const converter = getConverter(params);
        pathObjects = converter.extractParameterObjects(params, pathParams, 'path') ?? [];
      }
      const query = schemas.request?.query as any;
      if (query) {
        const converter = getConverter(query);
        queryObjects = converter.extractParameterObjects(query, pathParams, 'query') ?? [];
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
};
