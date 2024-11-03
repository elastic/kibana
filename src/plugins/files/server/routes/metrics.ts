/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FILES_MANAGE_PRIVILEGE } from '../../common/constants';
import type { FilesRouter } from './types';
import { FilesMetrics } from '../../common';
import { FilesClient } from '../../common/files_client';
import { CreateRouteDefinition, FILES_API_ROUTES } from './api_routes';
import type { FilesRequestHandler } from './types';

const method = 'get' as const;

export type Endpoint = CreateRouteDefinition<{}, FilesMetrics, FilesClient['getMetrics']>;

const handler: FilesRequestHandler = async ({ files }, req, res) => {
  const { fileService } = await files;
  const body: Endpoint['output'] = await fileService.asCurrentUser().getUsageMetrics();
  return res.ok({
    body,
  });
};

export function register(router: FilesRouter) {
  router[method](
    {
      path: FILES_API_ROUTES.metrics,
      validate: {},
      options: {
        tags: [`access:${FILES_MANAGE_PRIVILEGE}`],
      },
    },
    handler
  );
}
