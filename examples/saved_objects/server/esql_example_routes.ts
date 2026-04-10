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
import type { estypes } from '@elastic/elasticsearch';
import { isResponseError } from '@kbn/es-errors';
import { TYPE_A, TYPE_B } from './saved_objects';
import { setupData } from './saved_objects_data';

export function registerEsqlExampleRoutes(router: IRouter, log: Logger) {
  // Basic query — no user input, plain pipeline string is safe.
  router.versioned
    .post({
      path: '/api/saved_objects_example/_esql_query',
      summary: 'Query saved objects using ES|QL',
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
        log.info('Querying saved objects with ES|QL');
        const core = await ctx.core;
        const savedObjectsClient = core.savedObjects.client;
        await setupData(savedObjectsClient);
        try {
          // The `type` parameter controls index resolution (FROM clause is auto-generated)
          // and security filtering (type + namespace restrictions are injected via the
          // `filter` parameter). You don't need FROM or WHERE type == in your pipeline.
          const result = await savedObjectsClient.esql({
            type: [TYPE_A, TYPE_B],
            namespaces: ['default'],
            pipeline: `| KEEP type, ${TYPE_A}.myField, ${TYPE_B}.anotherField | SORT type | LIMIT 100`,
          });
          return res.ok({
            body: {
              columns: result.columns,
              values: result.values,
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

  // Parameterized query — when the pipeline includes user-provided values,
  // use ES|QL named params (`?paramName`) to prevent injection attacks.
  // Values are passed via the `params` array as `{ name: value }` entries
  // and are never interpolated into the query string.
  // Note: the ES client types don't include the named param record format,
  // but Elasticsearch supports named params at runtime.
  router.versioned
    .post({
      path: '/api/saved_objects_example/_esql_query_parameterized',
      summary: 'Query saved objects using ES|QL with parameters',
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
        const core = await ctx.core;
        const savedObjectsClient = core.savedObjects.client;
        await setupData(savedObjectsClient);

        // Simulate user input — NEVER interpolate this into the pipeline string.
        const searchTerm = 'some search term';

        try {
          const result = await savedObjectsClient.esql({
            type: TYPE_A,
            namespaces: ['default'],
            pipeline: `| WHERE ${TYPE_A}.myField == ?searchTerm | LIMIT 10`,
            params: [{ searchTerm }] as unknown as estypes.EsqlESQLParam[],
          });
          return res.ok({
            body: {
              columns: result.columns,
              values: result.values,
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
