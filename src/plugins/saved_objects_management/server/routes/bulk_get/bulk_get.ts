/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, IKibanaResponse } from '@kbn/core/server';
import { BulkGetHTTPResponseV1 } from '../../../common';
import { ISavedObjectsManagement } from '../../services';

import { bulkGet } from './lib';

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
    router.handleLegacyErrors(
      async (context, req, res): Promise<IKibanaResponse<BulkGetHTTPResponseV1>> => {
        const managementService = await managementServicePromise;
        const objects = await bulkGet({
          objects: req.body,
          managementService,
          ctx: (await context.core).savedObjects,
        });

        return res.ok({
          body: objects.map((object) => {
            const {
              meta: { isManaged, ...rest },
            } = object;
            return {
              ...object,
              meta: rest,
            };
          }),
        });
      }
    )
  );
};
