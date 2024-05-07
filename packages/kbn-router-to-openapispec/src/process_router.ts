/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Router } from '@kbn/core-http-router-server-internal';
import { getResponseValidation } from '@kbn/core-http-server';
import { ALLOWED_PUBLIC_VERSION as LATEST_SERVERLESS_VERSION } from '@kbn/core-http-router-server-internal';
import type { OpenAPIV3 } from 'openapi-types';
import type { OasConverter } from './oas_converter';
import {
  assignToPathsObject,
  extractContentType,
  extractValidationSchemaFromRoute,
  getPathParameters,
  getVersionedContentTypeString,
  getVersionedHeaderParam,
  prepareRoutes,
} from './util';
import type { OperationIdCounter } from './operation_id_counter';

export const processRouter = (
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
      const contentType = extractContentType(route.options?.body);

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
          summary: route.options.description ?? '',
          requestBody: !!validationSchemas?.body
            ? {
                content: {
                  [getVersionedContentTypeString(LATEST_SERVERLESS_VERSION, contentType)]: {
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

export type InternalRouterRoute = ReturnType<Router['getRoutes']>[0];
export const extractResponses = (route: InternalRouterRoute, converter: OasConverter) => {
  const responses: OpenAPIV3.ResponsesObject = {};
  if (!route.validationSchemas) return responses;
  const fullConfig = getResponseValidation(route.validationSchemas);

  if (fullConfig) {
    const { unsafe, ...validationSchemas } = fullConfig;
    const contentType = extractContentType(route.options?.body);
    return Object.entries(validationSchemas).reduce<OpenAPIV3.ResponsesObject>(
      (acc, [statusCode, schema]) => {
        const oasSchema = converter.convert(schema.body());
        acc[statusCode] = {
          ...acc[statusCode],
          description: route.options.description ?? 'No description',
          content: {
            ...((acc[statusCode] ?? {}) as OpenAPIV3.ResponseObject).content,
            [getVersionedContentTypeString(
              LATEST_SERVERLESS_VERSION,
              schema.bodyContentType ? [schema.bodyContentType] : contentType
            )]: {
              schema: oasSchema,
            },
          },
        };
        return acc;
      },
      responses
    );
  }

  return responses;
};
