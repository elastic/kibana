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
import type {
  TelemetryCollectionManagerPluginSetup,
  StatsGetterConfig,
} from '@kbn/telemetry-collection-manager-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { ApiOperation } from '@kbn/security-plugin-types-common';
import { RequestHandler } from '@kbn/core-http-server';
import { FetchSnapshotTelemetry } from '../../common/routes';
import { UsageStatsBody, v2 } from '../../common/types';

export type SecurityGetter = () => SecurityPluginStart | undefined;

export function registerTelemetryUsageStatsRoutes(
  router: IRouter,
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup,
  isDev: boolean,
  getSecurity: SecurityGetter
) {
  const v2Handler: RequestHandler<undefined, undefined, UsageStatsBody> = async (
    context,
    req,
    res
  ) => {
    const { unencrypted, refreshCache } = req.body;

    if (!(await telemetryCollectionManager.shouldGetTelemetry())) {
      // We probably won't reach here because there is a license check in the auth phase of the HTTP requests.
      // But let's keep it here should that changes at any point.
      return res.customError({
        statusCode: 503,
        body: `Can't fetch telemetry at the moment because some services are down. Check the /status page for more details.`,
      });
    }

    const security = getSecurity();
    // We need to check useRbacForRequest to figure out if ES has security enabled before making the privileges check
    if (security && unencrypted && security.authz.mode.useRbacForRequest(req)) {
      // Normally we would use `security: { authz: { requiredPrivileges: ['decryptedTelemetry'] } } }` in the route definition to check authorization for an
      // API action, however, we want to check this conditionally based on the `unencrypted` parameter. In this case we need to use the
      // security API directly to check privileges for this action. Note that the 'decryptedTelemetry' API privilege string is only
      // granted to users that have "Global All" or "Global Read" privileges in Kibana.
      const { checkPrivilegesWithRequest, actions } = security.authz;
      const privileges = { kibana: actions.api.get(ApiOperation.Read, 'decryptedTelemetry') };
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

      const body: v2.UnencryptedTelemetryPayload = await telemetryCollectionManager.getStats(
        statsConfig
      );
      return res.ok({ body });
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
  };

  const v2Validations = {
    request: {
      body: schema.object({
        unencrypted: schema.boolean({ defaultValue: false }),
        refreshCache: schema.boolean({ defaultValue: false }),
      }),
    },
  };

  router.versioned
    .post({
      access: 'internal',
      path: FetchSnapshotTelemetry,
      enableQueryVersion: true, // Allow specifying the version through querystring so that we can use it in Dev Console
    })
    // Just because it used to be /v2/, we are creating identical v1 and v2.
    .addVersion(
      {
        version: '1',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: v2Validations,
      },
      v2Handler
    )
    .addVersion(
      {
        version: '2',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: v2Validations,
      },
      v2Handler
    );
}
