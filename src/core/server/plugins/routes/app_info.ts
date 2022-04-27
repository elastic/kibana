/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';

export const registerAppInfoRoute = ({ router }: { router: IRouter }) => {
  router.post(
    {
      path: '/internal/core/plugins/app_info',
      options: {
        authRequired: false,
      },
      validate: {
        body: schema.object({
          appId: schema.string(),
          pluginId: schema.string(),
        }),
      },
    },
    async (ctx, req, res) => {
      // TODO
      return res.ok({ body: {} });
    }
  );
};
