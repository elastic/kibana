/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { IRouter, Logger, ReservedPrivilegesSet } from '@kbn/core/server';
import { CoreSetup } from '@kbn/core/server';
import { Duration } from 'moment';
import { runDeleteUnusedUrlsTask } from './task';

export const registerDeleteUnusedUrlsRoute = ({
  router,
  core,
  urlExpirationDuration,
  maxPageSize,
  logger,
}: {
  router: IRouter;
  core: CoreSetup;
  urlExpirationDuration: Duration;
  maxPageSize: number;
  logger: Logger;
}) => {
  router.post(
    {
      path: '/internal/unused_urls_cleanup/run',
      security: {
        authz: {
          requiredPrivileges: [ReservedPrivilegesSet.superuser],
        },
      },
      options: {
        access: 'internal',
        summary: 'Runs the unused URLs cleanup task',
      },
      validate: {},
    },
    async (_ctx, _req, res) => {
      await runDeleteUnusedUrlsTask({
        core,
        urlExpirationDuration,
        maxPageSize,
        logger,
      });

      return res.ok({
        body: {
          message: 'Unused URLs cleanup task has finished.',
        },
      });
    }
  );
};
