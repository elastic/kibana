/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable, combineLatest, ReplaySubject } from 'rxjs';
import { first } from 'rxjs/operators';
import { schema } from '@kbn/config-schema';

import { IRouter } from '../../http';
import { MetricsServiceSetup } from '../../metrics';
import { ServiceStatus, CoreStatus } from '../types';
import { PluginName } from '../../plugins';
import { calculateLegacyStatus, LegacyStatusInfo } from '../legacy_status';
import { PackageInfo } from '../../config';

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
    overall$: Observable<ServiceStatus>;
    core$: Observable<CoreStatus>;
    plugins$: Observable<Record<PluginName, ServiceStatus>>;
  };
}

interface StatusInfo {
  overall: ServiceStatus;
  core: CoreStatus;
  plugins: Record<string, ServiceStatus>;
}

interface StatusHttpBody {
  name: string;
  uuid: string;
  version: {
    number: string;
    build_hash: string;
    build_number: number;
    build_snapshot: boolean;
  };
  status: StatusInfo | LegacyStatusInfo;
  metrics: {
    /** ISO-8601 date string w/o timezone */
    last_updated: string;
    collection_interval_in_millis: number;
    process: {
      memory: {
        heap: {
          total_in_bytes: number;
          used_in_bytes: number;
          size_limit: number;
        };
        resident_set_size_in_bytes: number;
      };
      event_loop_delay: number;
      pid: number;
      uptime_in_millis: number;
    };
    os: {
      load: Record<string, number>;
      memory: {
        total_in_bytes: number;
        used_in_bytes: number;
        free_in_bytes: number;
      };
      uptime_in_millis: number;
      platform: string;
      platformRelease: string;
    };
    response_times: {
      max_in_millis: number;
    };
    requests: {
      total: number;
      disconnects: number;
      statusCodes: Record<number, number>;
      status_codes: Record<number, number>;
    };
    concurrent_connections: number;
  };
}

export const registerStatusRoute = ({ router, config, metrics, status }: Deps) => {
  // Since the status.plugins$ observable is not subscribed to elsewhere, we need to subscribe it here to eagerly load
  // the plugins status when Kibana starts up so this endpoint responds quickly on first boot.
  const combinedStatus$ = new ReplaySubject<
    [ServiceStatus<unknown>, CoreStatus, Record<string, ServiceStatus<unknown>>]
  >(1);
  combineLatest([status.overall$, status.core$, status.plugins$]).subscribe(combinedStatus$);

  router.get(
    {
      path: '/api/status',
      options: {
        authRequired: !config.allowAnonymous,
        tags: ['api'], // ensures that unauthenticated calls receive a 401 rather than a 302 redirect to login page
      },
      validate: {
        query: schema.object({
          v8format: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    async (context, req, res) => {
      const { version, buildSha, buildNum } = config.packageInfo;
      const versionWithoutSnapshot = version.replace(SNAPSHOT_POSTFIX, '');
      const [overall, core, plugins] = await combinedStatus$.pipe(first()).toPromise();

      let statusInfo: StatusInfo | LegacyStatusInfo;
      if (req.query?.v8format) {
        statusInfo = {
          overall,
          core,
          plugins,
        };
      } else {
        statusInfo = calculateLegacyStatus({
          overall,
          core,
          plugins,
          versionWithoutSnapshot,
        });
      }

      const lastMetrics = await metrics.getOpsMetrics$().pipe(first()).toPromise();

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
          response_times: lastMetrics.response_times,
          concurrent_connections: lastMetrics.concurrent_connections,
          requests: {
            ...lastMetrics.requests,
            status_codes: lastMetrics.requests.statusCodes,
          },
        },
      };

      return res.ok({ body });
    }
  );
};
