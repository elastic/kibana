/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';
import { getResponseValidation } from '@kbn/core-http-server';
import { CoreVersionedRouter, Router } from '@kbn/core-http-router-server-internal';
import { versionHandlerResolvers } from '@kbn/core-http-router-server-internal';
import { VersionedRouterRoute } from '@kbn/core-http-router-server-internal/src/versioned_router/types';
import {
  getPathParameters,
  extractValidationSchemaFromVersionedHandler,
  extractValidationSchemaFromRoute,
  getVersionedHeaderParam,
  getVersionedContentString,
} from './util';

const LATEST_SERVERLESS_VERSION = '2023-10-31';

import { OasConverter } from './oas_converter';
import { createOperationIdCounter, OperationIdCounter } from './operation_id_counter';

export const openApiVersion = '3.0.0';

export interface GenerateOpenApiDocumentOptions {
  title: string;
  description?: string;
  version: string;
  baseUrl: string;
  docsUrl?: string;
  tags?: string[];
  pathStartsWith?: string;
}

export const generateOpenApiDocument = (
  appRouters: { routers: Router[]; versionedRouters: CoreVersionedRouter[] },
  opts: GenerateOpenApiDocumentOptions
): OpenAPIV3.Document => {
  const converter = new OasConverter();
  const getOpId = createOperationIdCounter();
  const paths: OpenAPIV3.PathsObject = {};
  for (const router of appRouters.routers) {
    const result = processRouter(router, converter, getOpId, opts.pathStartsWith);
    Object.assign(paths, result.paths);
  }
  for (const router of appRouters.versionedRouters) {
    const result = processVersionedRouter(router, converter, getOpId, opts.pathStartsWith);
    Object.assign(paths, result.paths);
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
    components: converter.getSchemaComponents(),
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

const extractRequestBody = (
  route: VersionedRouterRoute,
  converter: OasConverter
): OpenAPIV3.RequestBodyObject['content'] => {
  return route.handlers.reduce<OpenAPIV3.RequestBodyObject['content']>((acc, handler) => {
    const schemas = extractValidationSchemaFromVersionedHandler(handler);
    if (!schemas?.request) return acc;
    const schema = converter.convert(schemas.request.body);
    return {
      ...acc,
      [getVersionedContentString(handler.options.version)]: {
        schema,
      },
    };
  }, {} as OpenAPIV3.RequestBodyObject['content']);
};

const extractVersionedResponses = (
  route: VersionedRouterRoute,
  converter: OasConverter
): OpenAPIV3.ResponsesObject => {
  return route.handlers.reduce<OpenAPIV3.ResponsesObject>((acc, handler) => {
    const schemas = extractValidationSchemaFromVersionedHandler(handler);
    if (!schemas?.response) return acc;
    const statusCodes = Object.keys(schemas.response);
    for (const statusCode of statusCodes) {
      const maybeSchema = schemas.response[statusCode as unknown as number].body;
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

const prepareRoutes = <R extends { path: string; options: { access?: 'public' | 'internal' } }>(
  routes: R[],
  pathStartsWith?: string
): R[] => {
  return (
    routes
      // TODO: Make this smarter?
      .filter(pathStartsWith ? (route) => route.path.startsWith(pathStartsWith) : () => true)
    // TODO: Figure out how we can scope which routes we generate OAS for
    // .filter((route) => route.options.access === 'public')
  );
};

const processVersionedRouter = (
  appRouter: CoreVersionedRouter,
  converter: OasConverter,
  getOpId: OperationIdCounter,
  pathStartsWith?: string
) => {
  const routes = prepareRoutes(appRouter.getRoutes(), pathStartsWith);
  const paths: OpenAPIV3.PathsObject = {};
  for (const route of routes) {
    const pathParams = getPathParameters(route.path);
    /**
     * Note: for a given route we accept that route params and query params remain BWC
     *       so we only take the latest version of the params and query params, we also
     *       assume at this point that we are generating for serverless.
     */
    let parameters: OpenAPIV3.ParameterObject[] = [];
    const versions = route.handlers.map(({ options: { version: v } }) => v).sort();
    const newestVersion = versionHandlerResolvers.newest(versions);
    const handler = route.handlers.find(({ options: { version: v } }) => v === newestVersion);
    const schemas = handler ? extractValidationSchemaFromVersionedHandler(handler) : undefined;

    try {
      if (handler && schemas) {
        const reqParams = schemas.request?.params as unknown;
        let pathObjects: OpenAPIV3.ParameterObject[] = [];
        let queryObjects: OpenAPIV3.ParameterObject[] = [];
        if (reqParams) {
          pathObjects = converter.convertPathParameters(reqParams, pathParams);
        }
        const reqQuery = schemas.request?.query as unknown;
        if (reqQuery) {
          queryObjects = converter.convertQuery(reqQuery);
        }
        parameters = [
          getVersionedHeaderParam(newestVersion, versions),
          ...pathObjects,
          ...queryObjects,
        ];
      }

      const hasBody = Boolean(
        handler && extractValidationSchemaFromVersionedHandler(handler)?.request?.body
      );
      const path: OpenAPIV3.PathItemObject = {
        [route.method]: {
          requestBody: hasBody
            ? {
                content: extractRequestBody(route, converter),
              }
            : undefined,
          responses: extractVersionedResponses(route, converter),
          parameters,
          operationId: getOpId(route.path),
        },
      };

      assignToPathsObject(paths, route.path, path);
    } catch (e) {
      // Enrich the error message with a bit more context
      e.message = `Error generating OpenAPI for route '${route.path}' using newest version '${newestVersion}': ${e.message}`;
      throw e;
    }
  }
  return { paths };
};

type InternalRouterRoute = ReturnType<Router['getRoutes']>[0];

const extractResponses = (route: InternalRouterRoute, converter: OasConverter) => {
  const responses: OpenAPIV3.ResponsesObject = {};
  if (!route.validationSchemas) return responses;
  const validationSchemas = getResponseValidation(route.validationSchemas);

  return !!validationSchemas
    ? Object.entries(validationSchemas).reduce<OpenAPIV3.ResponsesObject>(
        (acc, [statusCode, schema]) => {
          const oasSchema = converter.convert(schema.body);
          acc[statusCode] = {
            ...acc[statusCode],
            description: route.options.description ?? 'No description',
            content: {
              ...((acc[statusCode] ?? {}) as OpenAPIV3.ResponseObject).content,
              [getVersionedContentString(LATEST_SERVERLESS_VERSION)]: {
                schema: oasSchema,
              },
            },
          };
          return acc;
        },
        responses
      )
    : responses;
};

const processRouter = (
  appRouter: Router,
  converter: OasConverter,
  getOpId: OperationIdCounter,
  pathStartsWith?: string
) => {
  const routes = prepareRoutes(
    appRouter.getRoutes({ excludeVersionedRoutes: true }),
    pathStartsWith
  );

  const paths: OpenAPIV3.PathsObject = {};
  for (const route of routes) {
    try {
      const pathParams = getPathParameters(route.path);
      const validationSchemas = extractValidationSchemaFromRoute(route);

      let parameters: undefined | OpenAPIV3.ParameterObject[] = [];
      if (validationSchemas) {
        let pathObjects: OpenAPIV3.ParameterObject[] = [];
        let queryObjects: OpenAPIV3.ParameterObject[] = [];
        const reqParams = validationSchemas.params as unknown;
        if (reqParams) {
          pathObjects = converter.convertPathParameters(reqParams, pathParams);
        }
        const reqQuery = validationSchemas.query as unknown;
        if (reqQuery) {
          queryObjects = converter.convertQuery(reqQuery);
        }
        parameters = [
          getVersionedHeaderParam(LATEST_SERVERLESS_VERSION, [LATEST_SERVERLESS_VERSION]),
          ...pathObjects,
          ...queryObjects,
        ];
      }

      const path: OpenAPIV3.PathItemObject = {
        [route.method]: {
          requestBody: !!validationSchemas?.body
            ? {
                content: {
                  [getVersionedContentString(LATEST_SERVERLESS_VERSION)]: {
                    schema: converter.convert(validationSchemas.body),
                  },
                },
              }
            : undefined,
          responses: extractResponses(route, converter),
          parameters,
          operationId: getOpId(route.path),
        },
      };
      assignToPathsObject(paths, route.path, path);
    } catch (e) {
      // Enrich the error message with a bit more context
      e.message = `Error generating OpenAPI for route '${route.path}': ${e.message}`;
      throw e;
    }
  }
  return { paths };
};

const assignToPathsObject = (
  paths: OpenAPIV3.PathsObject,
  path: string,
  pathObject: OpenAPIV3.PathItemObject
): void => {
  const pathName = path.replace('?', '');
  paths[pathName] = { ...paths[pathName], ...pathObject };
};
