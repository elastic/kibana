/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup } from '@kbn/core/server';

export const setupOptionsListUserProfileSuggestRoute = ({ http, getStartServices }: CoreSetup) => {
  const router = http.createRouter();

  router.versioned
    .get({
      access: 'internal',
      path: '/internal/controls/user_profile/_suggest',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because authorization is delegated to the core user profile service.',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              searchTerm: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (_, request, response) => {
        try {
          const [coreStart] = await getStartServices();
          const users = await coreStart.userProfile.suggest({
            name: request.query.searchTerm,
            dataPath: 'avatar',
          });
          return response.ok({ body: users });
        } catch {
          return response.ok({ body: [] });
        }
      }
    );
};
