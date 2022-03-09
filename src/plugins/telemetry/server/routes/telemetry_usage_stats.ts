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
      if (security && unencrypted) {
        // Normally we would use `options: { tags: ['access:decryptedTelemetry'] }` in the route definition to check authorization for an
        // API action, however, we want to check this conditionally based on the `unencrypted` parameter. In this case we need to use the
        // security API directly to check privileges for this action. Note that the 'decryptedTelemetry' API privilege string is only
        // granted to users that have "Global All" or "Global Read" privileges in Kibana.
        const { checkPrivilegesWithRequest, actions } = security.authz;
        const privileges = { kibana: actions.api.get('decryptedTelemetry') };
        const { hasAllRequested } = await checkPrivilegesWithRequest(req).globally(privileges);
        if (!hasAllRequested) {
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
