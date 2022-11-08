/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';
import { CapabilitiesResolver } from '../resolve_capabilities';

const applicationIdRegexp = /^[a-zA-Z0-9_:-]+$/;

export function registerCapabilitiesRoutes(router: IRouter, resolver: CapabilitiesResolver) {
  router.post(
    {
      path: '/api/core/capabilities',
      options: {
        authRequired: 'optional',
      },
      validate: {
        query: schema.object({
          useDefaultCapabilities: schema.boolean({ defaultValue: false }),
        }),
        body: schema.object({
          applications: schema.arrayOf(
            schema.string({
              validate: (appName) => {
                if (!applicationIdRegexp.test(appName)) {
                  return 'Invalid application id';
                }
              },
            })
          ),
        }),
      },
    },
    async (ctx, req, res) => {
      const { useDefaultCapabilities } = req.query;
      const { applications } = req.body;
      const capabilities = await resolver(req, applications, useDefaultCapabilities);
      return res.ok({
        body: capabilities,
      });
    }
  );
}
