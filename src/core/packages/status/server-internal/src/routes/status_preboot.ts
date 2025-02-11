/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core-http-server';
import { ServiceStatusLevels } from '@kbn/core-status-common';
import type { RedactedStatusHttpBody } from './status_response_schemas';

export const registerPrebootStatusRoute = ({ router }: { router: IRouter }) => {
  router.get(
    {
      path: '/api/status',
      options: {
        authRequired: false,
        tags: ['api'],
        access: 'public', // needs to be public to allow access from "system" users like k8s readiness probes.
        excludeFromRateLimiter: true,
      },
      validate: false,
    },
    async (context, req, res) => {
      const body: RedactedStatusHttpBody = {
        status: {
          overall: {
            level: ServiceStatusLevels.unavailable.toString(),
          },
        },
      };
      return res.custom({
        body,
        statusCode: 503,
        bypassErrorFormat: true,
      });
    }
  );
};
