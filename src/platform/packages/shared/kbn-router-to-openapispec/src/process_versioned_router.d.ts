/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type CoreVersionedRouter } from '@kbn/core-http-router-server-internal';
import type { VersionedRouterRoute } from '@kbn/core-http-server';
import type { OpenAPIV3 } from 'openapi-types';
import type { Env, GenerateOpenApiDocumentOptionsFilters } from './generate_oas';
import type { OasConverter } from './oas_converter';
import type { GetOpId } from './util';
export interface ProcessVersionedRouterOptions {
  appRouter: CoreVersionedRouter;
  converter: OasConverter;
  getOpId: GetOpId;
  filters: GenerateOpenApiDocumentOptionsFilters;
  env?: Env;
}
export declare const processVersionedRouter: ({
  appRouter,
  converter,
  getOpId,
  filters,
  env,
}: ProcessVersionedRouterOptions) => Promise<{
  paths: OpenAPIV3.PathsObject<{}, {}>;
}>;
export declare const extractVersionedRequestBody: (
  handler: VersionedRouterRoute['handlers'][0],
  access: 'public' | 'internal',
  converter: OasConverter,
  contentType: string[]
) => {
  [x: string]: {
    schema: OpenAPIV3.SchemaObject;
  };
};
export declare const extractVersionedResponse: (
  handler: VersionedRouterRoute['handlers'][0],
  route: VersionedRouterRoute,
  converter: OasConverter,
  contentType: string[],
  operationId: string
) => OpenAPIV3.ResponsesObject;
