/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { injectMetaAttributes } from '../lib';
import { ISavedObjectsManagement } from '../services';

export const registerGetRoute = (
  router: IRouter,
  managementServicePromise: Promise<ISavedObjectsManagement>
) => {
  router.get(
    {
      path: '/api/kibana/management/saved_objects/{type}/{id}',
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { type, id } = req.params;
      const managementService = await managementServicePromise;
      const { getClient, typeRegistry } = context.core.savedObjects;
      const includedHiddenTypes = [type].filter(
        (entry) => typeRegistry.isHidden(entry) && typeRegistry.isImportableAndExportable(entry)
      );

      const client = getClient({ includedHiddenTypes });
      const findResponse = await client.get<any>(type, id);

      const enhancedSavedObject = injectMetaAttributes(findResponse, managementService);

      return res.ok({ body: enhancedSavedObject });
    })
  );
};
