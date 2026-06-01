/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { versionHandlerResolvers } from '@kbn/core-http-router-server-internal';
import type {
  RegisteredRouteQueryParameter,
  RouterRoute,
  VersionedRouterRoute,
} from '@kbn/core-http-server';
import type { OpenAPIV3 } from 'openapi-types';
import { OasConverter } from './oas_converter';
import { extractValidationSchemaFromRoute } from './util';

/**
 * Resolves the query validation schema of the newest version of a versioned route.
 *
 * Query parameters are assumed to remain backwards compatible across versions (the same
 * assumption the OpenAPI generator makes), so only the newest version is inspected.
 */
const getVersionedQuerySchema = (route: VersionedRouterRoute): unknown => {
  const versions = versionHandlerResolvers.sort(
    route.handlers.map(({ options: { version } }) => version),
    route.options.access
  );
  const newestVersion = versionHandlerResolvers.newest(versions, route.options.access);
  const handler = route.handlers.find(({ options: { version } }) => version === newestVersion);
  if (!handler) return undefined;

  const { validate } = handler.options;
  if (validate === false) return undefined;
  const schemas = typeof validate === 'function' ? validate() : validate;
  return schemas?.request?.query;
};

const resolveSchemaObject = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined
): OpenAPIV3.SchemaObject | undefined => {
  if (!schema || '$ref' in schema) return undefined;
  return schema;
};

/**
 * Pulls the closed set of allowed values out of an OpenAPI schema. Enumerations can be
 * declared directly on the schema or, for array parameters, on the array's `items`.
 */
const getEnumValues = (schema: OpenAPIV3.SchemaObject): unknown[] | undefined => {
  if (schema.enum?.length) return schema.enum;
  if (schema.type === 'array') {
    const items = resolveSchemaObject(schema.items);
    if (items?.enum?.length) return items.enum;
  }
  return undefined;
};

const toQueryParameter = (param: OpenAPIV3.ParameterObject): RegisteredRouteQueryParameter => {
  const { name, required = false } = param;
  const schema = resolveSchemaObject(param.schema);

  if (schema?.type === 'boolean') {
    return { name, required, flag: true };
  }

  const enumValues = schema ? getEnumValues(schema) : undefined;
  if (enumValues) {
    return { name, required, options: enumValues.map((value) => String(value)) };
  }

  return { name, required };
};

/**
 * Extracts the query-string parameters of a registered route from its query validation
 * schema, reusing the OpenAPI converter so both `@kbn/config-schema` and Zod schemas
 * (versioned or not) are handled consistently.
 *
 * Returns a lightweight, serializable shape (no OpenAPI types leak to callers) suitable
 * for autocomplete. Throws if the query schema cannot be converted, so callers that want
 * to be resilient to a single bad route should wrap this in a try/catch.
 */
export const extractRouteQueryParameters = (
  route: RouterRoute | VersionedRouterRoute
): RegisteredRouteQueryParameter[] => {
  const querySchema = route.isVersioned
    ? getVersionedQuerySchema(route as VersionedRouterRoute)
    : extractValidationSchemaFromRoute(route as RouterRoute)?.query;

  if (!querySchema) return [];

  const queryParameters = new OasConverter().convertQuery(querySchema);
  return queryParameters.map(toQueryParameter);
};
