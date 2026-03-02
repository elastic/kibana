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

export function registerEsqlExampleRoutes(router: IRouter, log: Logger) {
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
          // Basic ES|QL query demonstrating the esql method.
          // The `type` and `namespaces` options control which saved objects are accessible.
          // Security filters (namespace and type) are injected into the `filter` parameter
          // automatically — you don't need to filter by namespace in your query.
          //
          // For dynamic user input, use ES|QL named parameters (? placeholders) to prevent
          // injection attacks:
          //   query: 'FROM .kibana | WHERE type == ? | LIMIT ?',
          //   params: [TYPE_A, 100],
          //
          // Or use the `esql` tagged template from `@kbn/esql-language`:
          //   import { esql } from '@kbn/esql-language';
          //   const request = esql({ myType: TYPE_A })`
          //     FROM .kibana | WHERE type == ?myType | LIMIT 100
          //   `.toRequest();
          const result = await savedObjectsClient.esql({
            type: [TYPE_A, TYPE_B],
            namespaces: ['default'],
            query: `FROM .kibana
              | WHERE type == "${TYPE_A}" OR type == "${TYPE_B}"
              | KEEP type, ${TYPE_A}.myField, ${TYPE_B}.anotherField
              | SORT type
              | LIMIT 100`,
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
