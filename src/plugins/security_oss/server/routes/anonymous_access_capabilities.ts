/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { IRouter } from 'kibana/server';
import type { AnonymousAccessService } from '../plugin';

interface Deps {
  router: IRouter;
  getAnonymousAccessService: () => AnonymousAccessService | null;
}

/**
 * Defines route that returns capabilities of the anonymous service account.
 */
export function setupAnonymousAccessCapabilitiesRoute({ router, getAnonymousAccessService }: Deps) {
  router.get(
    { path: '/internal/security_oss/anonymous_access/capabilities', validate: false },
    async (_context, request, response) => {
      const anonymousAccessService = getAnonymousAccessService();
      if (!anonymousAccessService) {
        return response.custom({ statusCode: 501, body: 'Not Implemented' });
      }

      return response.ok({ body: await anonymousAccessService.getCapabilities(request) });
    }
  );
}
