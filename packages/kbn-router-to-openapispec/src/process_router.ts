/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Router } from '@kbn/core-http-router-server-internal';
import { getResponseValidation } from '@kbn/core-http-server';
import { ALLOWED_PUBLIC_VERSION as SERVERLESS_VERSION_2023_10_31 } from '@kbn/core-http-router-server-internal';
import type { OpenAPIV3 } from 'openapi-types';
import type { OasConverter } from './oas_converter';
import {
  getXsrfHeaderForMethod,
  assignToPaths,
  extractContentType,
  extractTags,
  extractValidationSchemaFromRoute,
  getPathParameters,
  getVersionedContentTypeString,
  getVersionedHeaderParam,
  mergeResponseContent,
  prepareRoutes,
} from './util';
import type { OperationIdCounter } from './operation_id_counter';
import type { GenerateOpenApiDocumentOptionsFilters } from './generate_oas';

export const processRouter = (
  appRouter: Router,
  converter: OasConverter,
  getOpId: OperationIdCounter,
  filters?: GenerateOpenApiDocumentOptionsFilters
) => {
  const paths: OpenAPIV3.PathsObject = {};
  if (filters?.version && filters.version !== SERVERLESS_VERSION_2023_10_31) return { paths };
  const routes = prepareRoutes(appRouter.getRoutes({ excludeVersionedRoutes: true }), filters);

  for (const route of routes) {
    try {
      const pathParams = getPathParameters(route.path);
      const validationSchemas = extractValidationSchemaFromRoute(route);
      const contentType = extractContentType(route.options?.body);

      const parameters: OpenAPIV3.ParameterObject[] = [
        getVersionedHeaderParam(SERVERLESS_VERSION_2023_10_31, [SERVERLESS_VERSION_2023_10_31]),
        ...getXsrfHeaderForMethod(route.method, route.options),
      ];
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
        parameters.push(...pathObjects, ...queryObjects);
      }

      const operation: OpenAPIV3.OperationObject = {
        summary: route.options.summary ?? '',
        tags: route.options.tags ? extractTags(route.options.tags) : [],
        ...(route.options.description ? { description: route.options.description } : {}),
        ...(route.options.deprecated ? { deprecated: route.options.deprecated } : {}),
        ...(route.options['x-discontinued']
          ? { 'x-discontinued': route.options['x-discontinued'] }
          : {}),
        requestBody: !!validationSchemas?.body
          ? {
              content: {
                [getVersionedContentTypeString(SERVERLESS_VERSION_2023_10_31, contentType)]: {
                  schema: converter.convert(validationSchemas.body),
                },
              },
            }
          : undefined,
        responses: extractResponses(route, converter),
        parameters,
        operationId: getOpId(route.path),
      };

      const path: OpenAPIV3.PathItemObject = {
        [route.method]: operation,
      };
      assignToPaths(paths, route.path, path);
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
        const newContent = schema.body
          ? {
              [getVersionedContentTypeString(
                SERVERLESS_VERSION_2023_10_31,
                schema.bodyContentType ? [schema.bodyContentType] : contentType
              )]: {
                schema: converter.convert(schema.body()),
              },
            }
          : undefined;
        acc[statusCode] = {
          ...acc[statusCode],
          description: schema.description!,
          ...mergeResponseContent(
            ((acc[statusCode] ?? {}) as OpenAPIV3.ResponseObject).content,
            newContent
          ),
        };
        return acc;
      },
      responses
    );
  }

  return responses;
};
