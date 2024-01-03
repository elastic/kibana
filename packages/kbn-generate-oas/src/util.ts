/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VersionedRouterRoute } from '@kbn/core-http-router-server-internal/src/versioned_router/types';

// https://github.com/jlalmes/trpc-openapi/blob/aea45441af785518df35c2bc173ae2ea6271e489/src/utils/path.ts#L5
export const getPathParameters = (path: string): string[] => {
  return Array.from(path.matchAll(/\{(.+?)\}/g)).map(([_, key]) => key!);
};

export const extractValidationSchemaFromHandler = (
  handler: VersionedRouterRoute['handlers'][0]
) => {
  if (handler.options.validate === false) return undefined;
  if (typeof handler.options.validate === 'function') return handler.options.validate();
  return handler.options.validate;
};

export const getVersionedContentString = (version: string): string => {
  return `application/json; Elastic-Api-Version=${version}`;
};
