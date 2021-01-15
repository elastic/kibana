/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
