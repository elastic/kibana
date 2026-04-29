/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { KBN_CLIENT_API_PREFIX, listHiddenTypes, catchAndReturnBoomErrors } from './utils';

export const registerGetRoute = (router: IRouter) => {
  router.get(
    {
      path: `${KBN_CLIENT_API_PREFIX}/{type}/{id}`,
      security: {
        authz: {
          requiredPrivileges: ['ftrApis'],
        },
      },
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
      },
    },
    catchAndReturnBoomErrors(async (ctx, req, res) => {
      const { type, id } = req.params;
      const { savedObjects } = await ctx.core;

      const hiddenTypes = listHiddenTypes(savedObjects.typeRegistry);
      const soClient = savedObjects.getClient({ includedHiddenTypes: hiddenTypes });

      const object = await soClient.get(type, id);
      return res.ok({ body: object });
    })
  );
};
