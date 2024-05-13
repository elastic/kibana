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
  getContentTypeString,
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

    let parameters: OpenAPIV3.ParameterObject[] = [];
    let version: undefined | string;
    let handler: undefined | VersionedRouterRoute['handlers'][0];

    if (filters?.version) {
      handler = route.handlers.find(({ options: { version: v } }) => v === filters.version);
      version = filters.version;
    } else {
      const versions = route.handlers.map(({ options: { version: v } }) => v).sort();
      version = versionHandlerResolvers.newest(versions);
      handler = route.handlers.find(({ options: { version: v } }) => v === version);
    }

    const schemas = handler ? extractValidationSchemaFromVersionedHandler(handler) : undefined;

    if (!handler) return {};

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
          getVersionedHeaderParam(version, [version!]),
          ...pathObjects,
          ...queryObjects,
        ];
      }

      const hasBody = Boolean(extractValidationSchemaFromVersionedHandler(handler)?.request?.body);
      const contentType = extractContentType(route.options.options?.body);
      const path: OpenAPIV3.PathItemObject = {
        [route.method]: {
          summary: route.options.description ?? '',
          requestBody: hasBody
            ? {
                content: extractVersionedRequestBody(handler, contentType, converter),
              }
            : undefined,
          responses: extractVersionedResponses(handler, contentType, converter),
          parameters,
          operationId: getOpId(route.path),
        },
      };

      assignToPathsObject(paths, route.path, path);
    } catch (e) {
      // Enrich the error message with a bit more context
      e.message = `Error generating OpenAPI for route '${route.path}' using version '${version}': ${e.message}`;
      throw e;
    }
  }
  return { paths };
};

export const extractVersionedRequestBody = (
  handler: VersionedRouterRoute['handlers'][0],
  contentType: string[],
  converter: OasConverter
): OpenAPIV3.RequestBodyObject['content'] => {
  const schemas = extractValidationSchemaFromVersionedHandler(handler);
  if (!schemas?.request) return {};
  const schema = converter.convert(schemas.request.body);
  return {
    [getContentTypeString(contentType)]: {
      schema,
    },
  };
};

export const extractVersionedResponses = (
  handler: VersionedRouterRoute['handlers'][0],
  contentType: string[],
  converter: OasConverter
) => {
  const schemas = extractValidationSchemaFromVersionedHandler(handler);
  if (!schemas?.response) return {};
  const { unsafe, ...responses } = schemas.response;
  const result: OpenAPIV3.ResponsesObject = {};
  for (const [statusCode, responseSchema] of Object.entries(responses)) {
    const maybeSchema = unwrapVersionedResponseBodyValidation(responseSchema.body);
    const schema = converter.convert(maybeSchema);
    result[statusCode] = {
      ...result[statusCode],
      content: {
        ...((result[statusCode] ?? {}) as OpenAPIV3.ResponseObject).content,
        [getContentTypeString(
          responseSchema.bodyContentType ? [responseSchema.bodyContentType] : contentType
        )]: {
          schema,
        },
      },
    };
  }
  return result;
};

const extractValidationSchemaFromVersionedHandler = (
  handler: VersionedRouterRoute['handlers'][0]
) => {
  if (handler.options.validate === false) return undefined;
  if (typeof handler.options.validate === 'function') return handler.options.validate();
  return handler.options.validate;
};
