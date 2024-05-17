/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  type RouteConfigOptionsBody,
  type RouteValidatorConfig,
  type RouterRoute,
  getRequestValidation,
} from '@kbn/core-http-server';
import type { OpenAPIV3 } from 'openapi-types';
import { KnownParameters } from './type';

export const getPathParameters = (path: string): KnownParameters => {
  return Array.from(path.matchAll(/\{(.+?)\}/g)).reduce<KnownParameters>((acc, [_, key]) => {
    const optional = key.endsWith('?');
    acc[optional ? key.slice(0, key.length - 1) : key] = { optional };
    return acc;
  }, {});
};

export const extractContentType = (body: undefined | RouteConfigOptionsBody) => {
  if (body?.accepts) {
    return Array.isArray(body.accepts) ? body.accepts : [body.accepts];
  }
  return ['application/json'];
};

export const getVersionedContentTypeString = (
  version: string,
  acceptedContentTypes: string[]
): string => {
  return `${acceptedContentTypes.join('; ')}; Elastic-Api-Version=${version}`;
};

export const extractValidationSchemaFromRoute = (
  route: RouterRoute
): undefined | RouteValidatorConfig<unknown, unknown, unknown> => {
  if (!route.validationSchemas) return undefined;
  return getRequestValidation(route.validationSchemas);
};

export const getVersionedHeaderParam = (
  defaultVersion: undefined | string,
  versions: string[]
): OpenAPIV3.ParameterObject => ({
  in: 'header',
  name: 'elastic-api-version',
  description: 'The version of the API to use',
  schema: {
    type: 'string',
    enum: versions,
    default: defaultVersion,
  },
});

export const prepareRoutes = <
  R extends { path: string; options: { access?: 'public' | 'internal' } },
>(
  routes: R[],
  pathStartsWith?: string
): R[] => {
  return routes.filter(
    pathStartsWith ? (route) => route.path.startsWith(pathStartsWith) : () => true
  );
};

export const assignToPathsObject = (
  paths: OpenAPIV3.PathsObject,
  path: string,
  pathObject: OpenAPIV3.PathItemObject
): void => {
  const pathName = path.replace('?', '');
  paths[pathName] = { ...paths[pathName], ...pathObject };
};
