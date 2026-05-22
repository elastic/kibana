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
import { esql } from '@elastic/esql';
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
          // TYPE_A and TYPE_B are compile-time constants — write field names inline.
          const result = await savedObjectsClient.esql({
            type: [TYPE_A, TYPE_B],
            namespaces: ['default'],
            pipeline: esql`KEEP type, \`type-a.myField\`, \`type-b.anotherField\` | SORT type | LIMIT 100`,
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

  // Parameterized query — use ${{ name: value }} holes in the esql tag for user-supplied
  // values. They become named ES|QL parameters forwarded over the wire, never in the query string.
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

        // Simulate user input — use ${{ name: value }} holes to promote the value to a
        // named parameter. The value is forwarded over the wire, never in the query string.
        const searchTerm = 'some search term';

        try {
          const result = await savedObjectsClient.esql({
            type: TYPE_A,
            namespaces: ['default'],
            pipeline: esql`WHERE ${esql.exp(`${TYPE_A}.myField`)} == ${{ searchTerm }} | LIMIT 10`,
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
