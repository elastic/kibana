/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  type CoreVersionedRouter,
  versionHandlerResolvers,
  VersionedRouterRoute,
  unwrapVersionedResponseBodyValidation,
} from '@kbn/core-http-router-server-internal';
import type { OpenAPIV3 } from 'openapi-types';
import type { GenerateOpenApiDocumentOptionsFilters } from './generate_oas';
import type { OasConverter } from './oas_converter';
import type { OperationIdCounter } from './operation_id_counter';
import {
  prepareRoutes,
  getPathParameters,
  extractContentType,
  assignToPathsObject,
  getVersionedHeaderParam,
  getVersionedContentTypeString,
} from './util';

export const processVersionedRouter = (
  appRouter: CoreVersionedRouter,
  converter: OasConverter,
  getOpId: OperationIdCounter,
  filters?: GenerateOpenApiDocumentOptionsFilters
) => {
  const routes = prepareRoutes(appRouter.getRoutes(), filters);
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
          summary: route.options.description ?? '',
          requestBody: hasBody
            ? {
                content: extractVersionedRequestBody(route, converter),
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

export const extractVersionedRequestBody = (
  route: VersionedRouterRoute,
  converter: OasConverter
): OpenAPIV3.RequestBodyObject['content'] => {
  const contentType = extractContentType(route.options.options?.body);
  return route.handlers.reduce<OpenAPIV3.RequestBodyObject['content']>((acc, handler) => {
    const schemas = extractValidationSchemaFromVersionedHandler(handler);
    if (!schemas?.request) return acc;
    const schema = converter.convert(schemas.request.body);
    return {
      ...acc,
      [getVersionedContentTypeString(handler.options.version, contentType)]: {
        schema,
      },
    };
  }, {});
};

export const extractVersionedResponses = (
  route: VersionedRouterRoute,
  converter: OasConverter
): OpenAPIV3.ResponsesObject => {
  const contentType = extractContentType(route.options.options?.body);
  return route.handlers.reduce<OpenAPIV3.ResponsesObject>((acc, handler) => {
    const schemas = extractValidationSchemaFromVersionedHandler(handler);
    if (!schemas?.response) return acc;
    const { unsafe, ...responses } = schemas.response;
    for (const [statusCode, responseSchema] of Object.entries(responses)) {
      const maybeSchema = unwrapVersionedResponseBodyValidation(responseSchema.body);
      const schema = converter.convert(maybeSchema);
      acc[statusCode] = {
        ...acc[statusCode],
        content: {
          ...((acc[statusCode] ?? {}) as OpenAPIV3.ResponseObject).content,
          [getVersionedContentTypeString(
            handler.options.version,
            responseSchema.bodyContentType ? [responseSchema.bodyContentType] : contentType
          )]: {
            schema,
          },
        },
      };
    }
    return acc;
  }, {});
};

const extractValidationSchemaFromVersionedHandler = (
  handler: VersionedRouterRoute['handlers'][0]
) => {
  if (handler.options.validate === false) return undefined;
  if (typeof handler.options.validate === 'function') return handler.options.validate();
  return handler.options.validate;
};
