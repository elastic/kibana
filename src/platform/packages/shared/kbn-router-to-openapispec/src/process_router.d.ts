/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Router } from '@kbn/core-http-router-server-internal';
import type { OpenAPIV3 } from 'openapi-types';
import type { OasConverter } from './oas_converter';
import type { GetOpId } from './util';
import type { Env, GenerateOpenApiDocumentOptionsFilters } from './generate_oas';
import type { InternalRouterRoute } from './type';
export interface ProcessRouterOptions {
  appRouter: Router;
  converter: OasConverter;
  getOpId: GetOpId;
  filters: GenerateOpenApiDocumentOptionsFilters;
  env?: Env;
}
export declare const processRouter: ({
  appRouter,
  converter,
  getOpId,
  filters,
  env,
}: ProcessRouterOptions) => Promise<{
  paths: OpenAPIV3.PathsObject<{}, {}>;
}>;
export declare const extractResponses: (
  route: InternalRouterRoute,
  converter: OasConverter
) => OpenAPIV3.ResponsesObject;
