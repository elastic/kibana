/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import {
  TelemetryCollectionManagerPluginSetup,
  StatsGetterConfig,
} from 'src/plugins/telemetry_collection_manager/server';
import type { SecurityPluginStart } from '../../../../../x-pack/plugins/security/server';

export type SecurityGetter = () => SecurityPluginStart | undefined;

export function registerTelemetryUsageStatsRoutes(
  router: IRouter,
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup,
  isDev: boolean,
  getSecurity: SecurityGetter
) {
  router.post(
    {
      path: '/api/telemetry/v2/clusters/_stats',
      validate: {
        body: schema.object({
          unencrypted: schema.boolean({ defaultValue: false }),
          refreshCache: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    async (context, req, res) => {
      const { unencrypted, refreshCache } = req.body;

      const security = getSecurity();
      if (security) {
        const hasEnoughPrivileges = await security.authz
          .checkPrivilegesWithRequest(req)
          .globally({ kibana: 'decryptedTelemetry' });
        if (!hasEnoughPrivileges) {
          return res.forbidden();
        }
      }

      try {
        const statsConfig: StatsGetterConfig = {
          unencrypted,
          refreshCache: unencrypted || refreshCache,
        };

        const stats = await telemetryCollectionManager.getStats(statsConfig);
        return res.ok({ body: stats });
      } catch (err) {
        if (isDev) {
          // don't ignore errors when running in dev mode
          throw err;
        }
        if (unencrypted && err.status === 403) {
          return res.forbidden();
        }
        // ignore errors and return empty set
        return res.ok({ body: [] });
      }
    }
  );
}
