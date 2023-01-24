/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { injectMetaAttributes } from '../lib';
import { ISavedObjectsManagement } from '../services';

export const registerBulkGetRoute = (
  router: IRouter,
  managementServicePromise: Promise<ISavedObjectsManagement>
) => {
  router.post(
    {
      path: '/api/kibana/management/saved_objects/_bulk_get',
      validate: {
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.string(),
          })
        ),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const managementService = await managementServicePromise;
      const { getClient, typeRegistry } = (await context.core).savedObjects;

      const objects = req.body;
      const uniqueTypes = objects.reduce((acc, { type }) => acc.add(type), new Set<string>());
      const includedHiddenTypes = Array.from(uniqueTypes).filter(
        (type) => typeRegistry.isHidden(type) && typeRegistry.isImportableAndExportable(type)
      );

      const client = getClient({ includedHiddenTypes });
      const response = await client.bulkGet<unknown>(objects);
      const enhancedObjects = response.saved_objects.map((obj) => {
        if (!obj.error) {
          return injectMetaAttributes(obj, managementService);
        }
        return obj;
      });

      return res.ok({ body: enhancedObjects });
    })
  );
};
