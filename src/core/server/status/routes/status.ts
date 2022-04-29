/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, combineLatest, ReplaySubject, firstValueFrom } from 'rxjs';
import { schema } from '@kbn/config-schema';

import { IRouter } from '../../http';
import { MetricsServiceSetup } from '../../metrics';
import type { CoreIncrementUsageCounter } from '../../core_usage_data/types';
import { ServiceStatus, CoreStatus, ServiceStatusLevels } from '../types';
import { PluginName } from '../../plugins';
import { calculateLegacyStatus, LegacyStatusInfo } from '../legacy_status';
import { PackageInfo } from '../../config';
import { StatusResponse } from '../../../types/status';

const SNAPSHOT_POSTFIX = /-SNAPSHOT$/;

interface Deps {
  router: IRouter;
  config: {
    allowAnonymous: boolean;
    packageInfo: PackageInfo;
    serverName: string;
    uuid: string;
  };
  metrics: MetricsServiceSetup;
  status: {
    coreOverall$: Observable<ServiceStatus>;
    overall$: Observable<ServiceStatus>;
    core$: Observable<CoreStatus>;
    plugins$: Observable<Record<PluginName, ServiceStatus>>;
  };
  incrementUsageCounter: CoreIncrementUsageCounter;
}

interface StatusInfo {
  overall: ServiceStatus;
  core: CoreStatus;
  plugins: Record<string, ServiceStatus>;
}

// The moment we remove support for the LegacyStatusInfo, we can use the StatusResponse straight away.
interface StatusHttpBody extends Omit<StatusResponse, 'status'> {
  status: StatusInfo | LegacyStatusInfo;
}

export const registerStatusRoute = ({
  router,
  config,
  metrics,
  status,
  incrementUsageCounter,
}: Deps) => {
  // Since the status.plugins$ observable is not subscribed to elsewhere, we need to subscribe it here to eagerly load
  // the plugins status when Kibana starts up so this endpoint responds quickly on first boot.
  const combinedStatus$ = new ReplaySubject<
    [ServiceStatus<unknown>, ServiceStatus, CoreStatus, Record<string, ServiceStatus<unknown>>]
  >(1);
  combineLatest([status.overall$, status.coreOverall$, status.core$, status.plugins$]).subscribe(
    combinedStatus$
  );

  router.get(
    {
      path: '/api/status',
      options: {
        authRequired: !config.allowAnonymous,
        tags: ['api'], // ensures that unauthenticated calls receive a 401 rather than a 302 redirect to login page
      },
      validate: {
        query: schema.object(
          {
            v7format: schema.maybe(schema.boolean()),
            v8format: schema.maybe(schema.boolean()),
          },
          {
            validate: ({ v7format, v8format }) => {
              if (typeof v7format === 'boolean' && typeof v8format === 'boolean') {
                return `provide only one format option: v7format or v8format`;
              }
            },
          }
        ),
      },
    },
    async (context, req, res) => {
      const { version, buildSha, buildNum } = config.packageInfo;
      const versionWithoutSnapshot = version.replace(SNAPSHOT_POSTFIX, '');
      const [overall, coreOverall, core, plugins] = await firstValueFrom(combinedStatus$);

      const { v8format = true, v7format = false } = req.query ?? {};

      let statusInfo: StatusInfo | LegacyStatusInfo;
      if (!v7format && v8format) {
        statusInfo = {
          overall,
          core,
          plugins,
        };
      } else {
        incrementUsageCounter({ counterName: 'status_v7format' });
        statusInfo = calculateLegacyStatus({
          overall,
          core,
          plugins,
          versionWithoutSnapshot,
        });
      }

      const lastMetrics = await firstValueFrom(metrics.getOpsMetrics$());

      const body: StatusHttpBody = {
        name: config.serverName,
        uuid: config.uuid,
        version: {
          number: versionWithoutSnapshot,
          build_hash: buildSha,
          build_number: buildNum,
          build_snapshot: SNAPSHOT_POSTFIX.test(version),
        },
        status: statusInfo,
        metrics: {
          last_updated: lastMetrics.collected_at.toISOString(),
          collection_interval_in_millis: metrics.collectionInterval,
          os: lastMetrics.os,
          process: lastMetrics.process,
          processes: lastMetrics.processes,
          response_times: lastMetrics.response_times,
          concurrent_connections: lastMetrics.concurrent_connections,
          requests: {
            ...lastMetrics.requests,
            status_codes: lastMetrics.requests.statusCodes,
          },
        },
      };

      const statusCode = coreOverall.level >= ServiceStatusLevels.unavailable ? 503 : 200;
      return res.custom({ body, statusCode, bypassErrorFormat: true });
    }
  );
};
