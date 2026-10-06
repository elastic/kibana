/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreVersionedRouter, Router } from '@kbn/core-http-router-server-internal';
import type { OpenAPIV3 } from 'openapi-types';
export declare const openApiVersion = '3.0.0';
export interface Env {
  serverless: boolean;
}
export interface GenerateOpenApiDocumentOptionsFilters {
  pathStartsWith?: string[];
  excludePathsMatching?: string[];
  /** @default 'public' */
  access: 'public' | 'internal';
  /**
   * We generate spec for one version at a time
   * @default '2023-10-31' if access is public, otherwise undefined
   */
  version?: string;
}
export interface GenerateOpenApiDocumentOptions {
  title: string;
  description?: string;
  version: string;
  baseUrl: string;
  docsUrl?: string;
  tags?: string[];
  env?: Env;
  filters?: GenerateOpenApiDocumentOptionsFilters;
}
export declare const generateOpenApiDocument: (
  appRouters: {
    routers: Router[];
    versionedRouters: CoreVersionedRouter[];
  },
  opts: GenerateOpenApiDocumentOptions
) => Promise<OpenAPIV3.Document>;
