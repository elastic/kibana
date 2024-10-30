/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { FeatureFlagExampleNumber } from '../../common/feature_flags';

export function defineRoutes(router: IRouter) {
  router.versioned
    .get({
      path: '/api/feature_flags_example/example',
      access: 'public',
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          response: {
            200: {
              body: () =>
                schema.object({
                  number: schema.number(),
                }),
            },
          },
        },
      },
      async (context, request, response) => {
        const { featureFlags } = await context.core;

        return response.ok({
          body: {
            number: await featureFlags.getNumberValue(FeatureFlagExampleNumber, 1),
          },
        });
      }
    );
}
