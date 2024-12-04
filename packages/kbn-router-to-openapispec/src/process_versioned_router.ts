/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type CoreVersionedRouter,
  versionHandlerResolvers,
  unwrapVersionedResponseBodyValidation,
} from '@kbn/core-http-router-server-internal';
import type { RouteMethod, VersionedRouterRoute } from '@kbn/core-http-server';
import type { OpenAPIV3 } from 'openapi-types';
import { extractAuthzDescription } from './extract_authz_description';
import type { GenerateOpenApiDocumentOptionsFilters } from './generate_oas';
import type { OasConverter } from './oas_converter';
import { isReferenceObject } from './oas_converter/common';
import {
  prepareRoutes,
  getPathParameters,
  extractContentType,
  assignToPaths,
  getVersionedHeaderParam,
  getVersionedContentTypeString,
  extractTags,
  mergeResponseContent,
  getXsrfHeaderForMethod,
  setXState,
  GetOpId,
} from './util';

export const processVersionedRouter = (
  appRouter: CoreVersionedRouter,
  converter: OasConverter,
  getOpId: GetOpId,
  filters: GenerateOpenApiDocumentOptionsFilters
) => {
  const routes = prepareRoutes(appRouter.getRoutes(), filters);
  const paths: OpenAPIV3.PathsObject = {};
  for (const route of routes) {
    const pathParams = getPathParameters(route.path);

    let parameters: OpenAPIV3.ParameterObject[] = [];
    let version: undefined | string;
    let handler: undefined | VersionedRouterRoute['handlers'][0];
    let versions: string[] = versionHandlerResolvers.sort(
      route.handlers.map(({ options: { version: v } }) => v),
      route.options.access
    );

    const versionIdx = versions.indexOf(filters.version!);
    if (versionIdx === -1) return { paths };
    versions = versions.slice(0, versionIdx + 1);
    handler = route.handlers.find(({ options: { version: v } }) => v === filters.version);
    version = filters.version;

    if (!handler) return { paths };

    const schemas = extractValidationSchemaFromVersionedHandler(handler);

    try {
      if (schemas) {
        /**
         * Note: for a given route we accept that route params and query params remain BWC
         *       so we only take the latest version of the params and query params, we also
         *       assume at this point that we are generating for serverless.
         */
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
          ...(route.options.access === 'internal'
            ? [getVersionedHeaderParam(version, versions)]
            : ([] as OpenAPIV3.ParameterObject[])),
          ...getXsrfHeaderForMethod(route.method as RouteMethod, route.options.options),
          ...pathObjects,
          ...queryObjects,
        ];
      }
      let description = `${route.options.description ?? ''}`;
      if (route.options.security) {
        const authzDescription = extractAuthzDescription(route.options.security);

        description += `${route.options.description && authzDescription ? '<br/><br/>' : ''}${
          authzDescription ?? ''
        }`;
      }

      const hasBody = Boolean(extractValidationSchemaFromVersionedHandler(handler)?.request?.body);
      const contentType = extractContentType(route.options.options?.body);
      // If any handler is deprecated we show deprecated: true in the spec
      const hasDeprecations = route.handlers.some(({ options }) => !!options.options?.deprecated);
      const operation: OpenAPIV3.OperationObject = {
        summary: route.options.summary ?? '',
        tags: route.options.options?.tags ? extractTags(route.options.options.tags) : [],
        ...(description ? { description } : {}),
        ...(hasDeprecations ? { deprecated: true } : {}),
        ...(route.options.discontinued ? { 'x-discontinued': route.options.discontinued } : {}),
        requestBody: hasBody
          ? {
              content: extractVersionedRequestBody(
                handler,
                route.options.access,
                converter,
                contentType
              ),
            }
          : undefined,
        responses: extractVersionedResponse(handler, route.options.access, converter, contentType),
        parameters,
        operationId: getOpId({ path: route.path, method: route.method }),
      };

      setXState(route.options.options?.availability, operation);

      const path: OpenAPIV3.PathItemObject = {
        [route.method]: operation,
      };

      assignToPaths(paths, route.path, path);
    } catch (e) {
      // Enrich the error message with a bit more context
      e.message = `Error generating OpenAPI for route '${route.path}' using newest version '${version}': ${e.message}`;
      throw e;
    }
  }
  return { paths };
};

export const extractVersionedRequestBody = (
  handler: VersionedRouterRoute['handlers'][0],
  access: 'public' | 'internal',
  converter: OasConverter,
  contentType: string[]
) => {
  const schemas = extractValidationSchemaFromVersionedHandler(handler);
  if (!schemas?.request) return {};
  const schema = converter.convert(schemas.request.body);
  return {
    [getVersionedContentTypeString(handler.options.version, access, contentType)]: {
      schema,
    },
  };
};

export const extractVersionedResponse = (
  handler: VersionedRouterRoute['handlers'][0],
  access: 'public' | 'internal',
  converter: OasConverter,
  contentType: string[]
) => {
  const schemas = extractValidationSchemaFromVersionedHandler(handler);
  if (!schemas?.response) return {};
  const result: OpenAPIV3.ResponsesObject = {};
  const { unsafe, ...responses } = schemas.response;
  for (const [statusCode, responseSchema] of Object.entries(responses)) {
    let newContent: OpenAPIV3.ResponseObject['content'];
    if (responseSchema.body) {
      const maybeSchema = unwrapVersionedResponseBodyValidation(responseSchema.body);
      const schema = converter.convert(maybeSchema);
      const contentTypeString = getVersionedContentTypeString(
        handler.options.version,
        access,
        responseSchema.bodyContentType ? [responseSchema.bodyContentType] : contentType
      );
      newContent = {
        [contentTypeString]: {
          schema,
        },
      };
    }
    result[statusCode] = {
      ...result[statusCode],
      description: responseSchema.description!,
      ...mergeResponseContent(
        ((result[statusCode] ?? {}) as OpenAPIV3.ResponseObject).content,
        newContent
      ),
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
