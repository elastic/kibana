/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { CoreVersionedRouter, Router } from '@kbn/core-http-router-server-internal';
import { OasConverter } from './oas_converter';
import { createOperationIdCounter } from './operation_id_counter';
import { processRouter } from './process_router';
import { processVersionedRouter } from './process_versioned_router';

export const openApiVersion = '3.0.0';

export interface GenerateOpenApiDocumentOptions {
  title: string;
  description?: string;
  version: string;
  baseUrl: string;
  docsUrl?: string;
  tags?: string[];
  pathStartsWith?: string;
}

export const generateOpenApiDocument = (
  appRouters: { routers: Router[]; versionedRouters: CoreVersionedRouter[] },
  opts: GenerateOpenApiDocumentOptions
): OpenAPIV3.Document => {
  const converter = new OasConverter();
  const getOpId = createOperationIdCounter();
  const paths: OpenAPIV3.PathsObject = {};
  for (const router of appRouters.routers) {
    const result = processRouter(router, converter, getOpId, opts.pathStartsWith);
    Object.assign(paths, result.paths);
  }
  for (const router of appRouters.versionedRouters) {
    const result = processVersionedRouter(router, converter, getOpId, opts.pathStartsWith);
    Object.assign(paths, result.paths);
  }
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
    tags: opts.tags?.map((tag) => ({ name: tag })),
    externalDocs: opts.docsUrl ? { url: opts.docsUrl } : undefined,
  };
};
