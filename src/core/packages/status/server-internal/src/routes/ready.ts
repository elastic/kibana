/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';

export const registerReadyRoute = ({
  router,
  isReady,
}: {
  router: IRouter<RequestHandlerContext>;
  isReady: () => boolean;
}) => {
  router.get(
    {
      path: '/api/ready',
      security: {
        authz: {
          enabled: false,
          reason: 'Readiness route should be accessible without authorization.',
        },
        authc: {
          enabled: false,
          reason:
            'Readiness route must be accessible by unauthenticated system users such as k8s probes.',
        },
      },
      options: {
        tags: ['api', 'oas-tag:system'],
        access: 'public',
        excludeFromRateLimiter: true,
        summary: `Get Kibana's readiness`,
        description:
          'Returns whether Kibana is ready to serve traffic. This endpoint is intended for readiness probes.',
      },
      validate: false,
    },
    async (_context, _req, res) => {
      if (isReady()) {
        return res.ok({ body: { ok: true } });
      }

      return res.custom({
        body: { ok: false },
        statusCode: 503,
        headers: { 'Retry-After': '5' },
        bypassErrorFormat: true,
      });
    }
  );
};
