/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { InternalSavedObjectRouter } from '../internal_types';
import {
  catchAndReturnBoomErrors,
  removeHiddenFromBulkRequest,
  throwOnGloballyHiddenTypes,
} from './utils';

interface RouteDependencies {
  coreUsageData: InternalCoreUsageDataSetup;
}

export const registerBulkGetRoute = (
  router: InternalSavedObjectRouter,
  { coreUsageData }: RouteDependencies
) => {
  router.post(
    {
      path: '/_bulk_get',
      validate: {
        query: schema.object({ ignoreHidden: schema.maybe(schema.boolean()) }),
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.string(),
            fields: schema.maybe(schema.arrayOf(schema.string())),
            namespaces: schema.maybe(schema.arrayOf(schema.string())),
          })
        ),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      let itemsToGet = req.body;
      const { ignoreHidden } = req.query;
      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsBulkGet({ request: req }).catch(() => {});

      const { getClient, typeRegistry } = (await context.core).savedObjects;
      const client = getClient();
      // filter out types that aren't exposed to the http API's and return a new response for the combined result OR
      // check that all types provided are exposed to the http API's; if not, throw error
      const allTypesVisibleToHttpApis = typeRegistry
        .getVisibleToHttpApisTypes() // only types with hidden:false && hiddenFromHttpApis:false
        .map((fullType) => fullType.name);
      /* now we have options:
       1. throw on types hidden from the HTTP API's
          1.a. using a request query param to ignore hiddenFromHttpApis for the whole request (all items) as an override
          1.b. optional configuration option to only override some APIs? Config would need to be per type, potentially as a Map or array of end-points or per-endpoint string
       2. filter out the types hidden from the HTTP API and pass the rest along, adding error to the response body for those types
       3. do nothing
      */
      if (!ignoreHidden) {
        throwOnGloballyHiddenTypes(
          // note: this will also throw if there are any hidden:true SO's in the request body.}
          allTypesVisibleToHttpApis,
          req.body.map(({ type }) => type)
        );
      }
      if (ignoreHidden) {
        itemsToGet = removeHiddenFromBulkRequest(itemsToGet, allTypesVisibleToHttpApis);
      }
      const result = await client.bulkGet([...itemsToGet]);
      return res.ok({ body: result });
    })
  );
};
