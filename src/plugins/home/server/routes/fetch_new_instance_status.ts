/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from 'src/core/server';
import { isNewInstance } from '../services/new_instance_status';

export const registerNewInstanceStatusRoute = (router: IRouter) => {
  router.get(
    {
      path: '/internal/home/new_instance_status',
      validate: false,
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { client: soClient } = context.core.savedObjects;
      const { client: esClient } = context.core.elasticsearch;

      try {
        return res.ok({
          body: {
            isNewInstance: await isNewInstance({ esClient, soClient }),
          },
        });
      } catch (e) {
        return res.customError({
          statusCode: 500,
        });
      }
    })
  );
};
