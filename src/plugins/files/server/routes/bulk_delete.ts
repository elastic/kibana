/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { FILES_MANAGE_PRIVILEGE } from '../../common/constants';
import { FilesClient } from '../../common/files_client';
import type { CreateHandler, FilesRouter } from './types';
import { FILES_API_ROUTES, CreateRouteDefinition } from './api_routes';

const method = 'delete' as const;

const rt = {
  body: schema.object({
    ids: schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1, maxSize: 100 }),
  }),
};

export type Endpoint = CreateRouteDefinition<
  typeof rt,
  {
    /**
     * The files that were deleted
     */
    succeeded: string[];
    /**
     * Any failed deletions. Only included in the response if there were failures.
     */
    failed?: Array<[id: string, reason: string]>;
  },
  FilesClient['bulkDelete']
>;

const handler: CreateHandler<Endpoint> = async ({ files }, req, res) => {
  const fileService = (await files).fileService.asCurrentUser();
  const {
    body: { ids },
  } = req;

  const succeeded: string[] = [];
  const failed: Array<[string, string]> = [];
  for (const id of ids) {
    try {
      await fileService.delete({ id });
      succeeded.push(id);
    } catch (e) {
      failed.push([id, e.message]);
    }
  }

  const body: Endpoint['output'] = {
    succeeded,
    failed: failed.length ? failed : undefined,
  };

  return res.ok({
    body,
  });
};

export function register(router: FilesRouter) {
  router[method](
    {
      path: FILES_API_ROUTES.bulkDelete,
      validate: { ...rt },
      options: {
        tags: [`access:${FILES_MANAGE_PRIVILEGE}`],
      },
    },
    handler
  );
}
