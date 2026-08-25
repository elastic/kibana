/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import {
  MAX_SAVED_OBJECT_ID_LENGTH,
  MAX_SAVED_OBJECT_TYPE_LENGTH,
  MAX_SAVED_OBJECTS_PER_BULK_REQUEST,
} from '@kbn/core-saved-objects-server';
import type { v1 } from '../../common';

export const registerBulkDeleteRoute = (router: IRouter) => {
  router.post(
    {
      path: '/internal/kibana/management/saved_objects/_bulk_delete',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: schema.arrayOf(
          schema.object({
            type: schema.string({ maxLength: MAX_SAVED_OBJECT_TYPE_LENGTH }),
            id: schema.string({ maxLength: MAX_SAVED_OBJECT_ID_LENGTH }),
          }),
          { maxSize: MAX_SAVED_OBJECTS_PER_BULK_REQUEST }
        ),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { getClient } = (await context.core).savedObjects;

      const objects = req.body;
      const client = getClient();
      const response = await client.bulkDelete(objects, { force: true });

      const body: v1.BulkDeleteResponseHTTP = response.statuses;
      return res.ok({ body });
    })
  );
};
