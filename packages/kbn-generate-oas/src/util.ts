/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VersionedRouterRoute } from '@kbn/core-http-router-server-internal/src/versioned_router/types';
import { RouterRoute, RouteValidatorConfig } from '@kbn/core-http-server';
import { KnownParameters } from './type';

export const getPathParameters = (path: string): KnownParameters => {
  return Array.from(path.matchAll(/\{(.+?)\}/g)).reduce<KnownParameters>((acc, [_, key]) => {
    const optional = key.endsWith('?');
    acc[optional ? key.slice(0, key.length - 1) : key] = { optional };
    return acc;
  }, {});
};

export const extractValidationSchemaFromVersionedHandler = (
  handler: VersionedRouterRoute['handlers'][0]
) => {
  if (handler.options.validate === false) return undefined;
  if (typeof handler.options.validate === 'function') return handler.options.validate();
  return handler.options.validate;
};

export const getVersionedContentString = (version: string): string => {
  return `application/json; Elastic-Api-Version=${version}`;
};

export const getJSONContentString = () => {
  return 'application/json';
};

export const extractValidationSchemaFromRoute = (
  route: RouterRoute
): undefined | RouteValidatorConfig<unknown, unknown, unknown> => {
  if (route.validationSchemas === false) return undefined;
  return route.validationSchemas;
};
