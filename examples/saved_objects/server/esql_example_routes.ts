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
import { esql } from '@kbn/esql-language';
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
          // Use the `esql` tagged template from `@kbn/esql-language` for safe query
          // construction. The ${{ name: value }} syntax creates named ?param placeholders,
          // separating code from data at the protocol level (preventing injection attacks).
          //
          // The `type` and `namespaces` options control which saved objects are accessible.
          // Security filters (namespace and type) are injected into the `filter` parameter
          // automatically — you don't need to filter by namespace in your query.
          const query = esql`FROM .kibana
            | WHERE type == ${{ typeA: TYPE_A }} OR type == ${{ typeB: TYPE_B }}
            | KEEP type, ${TYPE_A}.myField, ${TYPE_B}.anotherField
            | SORT type
            | LIMIT 100`;

          // Extract query string and named params separately.
          // The ES client TypeScript types don't include the named param record format,
          // but Elasticsearch supports named params at runtime.
          const params = query.getParams();
          const result = await savedObjectsClient.esql({
            type: [TYPE_A, TYPE_B],
            namespaces: ['default'],
            query: query.print(),
            // Named params are supported by ES at runtime but the ES client TypeScript
            // types only define positional params (EsqlESQLParam = FieldValue | FieldValue[]).
            // Cast through unknown to bridge the type gap.
            params: Object.entries(params).map(([k, v]) => ({
              [k]: v,
            })) as unknown as estypes.EsqlESQLParam[],
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
