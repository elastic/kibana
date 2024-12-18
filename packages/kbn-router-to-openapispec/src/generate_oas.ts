/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreVersionedRouter, Router } from '@kbn/core-http-router-server-internal';
import { BASE_PUBLIC_VERSION as SERVERLESS_VERSION_2023_10_31 } from '@kbn/core-http-router-server-internal';
import type { OpenAPIV3 } from 'openapi-types';
import { OasConverter } from './oas_converter';
import { processRouter } from './process_router';
import { processVersionedRouter } from './process_versioned_router';
import { buildGlobalTags, createOpIdGenerator } from './util';

export const openApiVersion = '3.0.0';

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
  filters?: GenerateOpenApiDocumentOptionsFilters;
}

export const generateOpenApiDocument = (
  appRouters: { routers: Router[]; versionedRouters: CoreVersionedRouter[] },
  opts: GenerateOpenApiDocumentOptions
): OpenAPIV3.Document => {
  let { filters = { access: 'public' } } = opts;
  if (filters.access === 'public' && !filters.version) {
    filters = { ...filters, version: SERVERLESS_VERSION_2023_10_31 };
  }
  const converter = new OasConverter();
  const paths: OpenAPIV3.PathsObject = {};
  const getOpId = createOpIdGenerator();
  for (const router of appRouters.routers) {
    const result = processRouter(router, converter, getOpId, filters);
    Object.assign(paths, result.paths);
  }
  for (const router of appRouters.versionedRouters) {
    const result = processVersionedRouter(router, converter, getOpId, filters);
    Object.assign(paths, result.paths);
  }
  const tags = buildGlobalTags(paths, opts.tags);
  return {
    openapi: openApiVersion,
    info: {
      title: opts.title,
      description: opts.description,
      version: opts.version,
    },
    servers: [
      {
        url: opts.baseUrl,
      },
    ],
    paths,
    components: {
      ...converter.getSchemaComponents(),
      securitySchemes: {
        basicAuth: {
          type: 'http',
          scheme: 'basic',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
        },
      },
    },
    security: [{ basicAuth: [] }],
    tags,
    externalDocs: opts.docsUrl ? { url: opts.docsUrl } : undefined,
  };
};
