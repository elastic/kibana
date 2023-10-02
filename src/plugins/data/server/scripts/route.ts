/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { SCRIPT_LANGUAGES_ROUTE_LATEST_VERSION } from '../../common/constants';

export function registerScriptsRoute(router: IRouter) {
  router.versioned
    .get({
      path: '/internal/scripts/languages',
      access: 'internal',
    })
    .addVersion(
      {
        version: SCRIPT_LANGUAGES_ROUTE_LATEST_VERSION,
        validate: {
          response: {
            '200': {
              body: schema.arrayOf(schema.string()),
            },
          },
        },
      },
      async (context, request, response) => {
        return response.ok({
          body: ['painless', 'expression'],
        });
      }
    );
}
