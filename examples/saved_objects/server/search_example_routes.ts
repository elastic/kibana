/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AuthzDisabled } from '@kbn/core-security-server';
import type { IRouter, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { TYPE_A, TYPE_B } from './saved_objects';
import { setupData } from './saved_objects_data';

export function registerSearchExampleRoutes(router: IRouter, log: Logger) {
  router.versioned
    .post({
      path: '/api/saved_objects_example/_search_multiple_types_with_sorting',
      summary: 'Search across multiple types of saved objects',
      access: 'public',
      security: {
        authz: AuthzDisabled.fromReason('This route is an example'),
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
      async (ctx, req, res) => {
        log.info('Searching for saved objects');
        const core = await ctx.core;
        const savedObjectsClient = core.savedObjects.client;
        await setupData(savedObjectsClient);
        try {
          const result = await savedObjectsClient.search({
            type: [TYPE_A, TYPE_B],
            namespaces: ['default'],
            query: {
              bool: {
                must: [
                  {
                    match_all: {},
                  },
                ],
              },
            },
            runtime_mappings: {
              merged_date: {
                type: 'date',
                script: {
                  source: `
                if (doc.containsKey(params.typeA + '.myDateField') && !doc[params.typeA + '.myDateField'].empty) {
                  emit(doc[params.typeA + '.myDateField'].value.toInstant().toEpochMilli());
                } else if (doc.containsKey(params.typeB + '.myOtherDateField') && !doc[params.typeB + '.myOtherDateField'].empty) {
                  emit(doc[params.typeB + '.myOtherDateField'].value.toInstant().toEpochMilli());
                }
              `,
                  params: {
                    typeA: TYPE_A,
                    typeB: TYPE_B,
                  },
                },
              },
            },
            sort: [
              {
                merged_date: {
                  order: 'desc',
                  unmapped_type: 'date',
                },
              },
            ],
          });
          return res.ok({
            body: {
              result,
            },
          });
        } catch (e) {
          if (isResponseError(e)) {
            log.error(JSON.stringify(e.meta.body, null, 2));
          }
          throw e;
        }
      }
    );
}
