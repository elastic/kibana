/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, combineLatest, ReplaySubject, firstValueFrom } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type { PackageInfo } from '@kbn/config';
import type { PluginName } from '@kbn/core-base-common';
import type { IRouter } from '@kbn/core-http-server';
import type { MetricsServiceSetup } from '@kbn/core-metrics-server';
import type { CoreIncrementUsageCounter } from '@kbn/core-usage-data-server';
import type { StatusResponse } from '@kbn/core-status-common-internal';
import {
  ServiceStatus,
  ServiceStatusLevel,
  CoreStatus,
  ServiceStatusLevels,
} from '@kbn/core-status-common';
import { calculateLegacyStatus, LegacyStatusInfo } from '../legacy_status';

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

export interface RedactedStatusHttpBody {
  status: {
    overall: {
      level: ServiceStatusLevel;
    };
  };
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
        authRequired: 'optional',
        // The `api` tag ensures that unauthenticated calls receive a 401 rather than a 302 redirect to login page.
        // The `security:acceptJWT` tag allows route to be accessed with JWT credentials. It points to
        // ROUTE_TAG_ACCEPT_JWT from '@kbn/security-plugin/server' that cannot be imported here directly.
        tags: ['api', 'security:acceptJWT'],
        access: 'public', // needs to be public to allow access from "system" users like k8s readiness probes.
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
      const authRequired = !config.allowAnonymous;
      const isAuthenticated = req.auth.isAuthenticated;
      const redactedStatus = authRequired && !isAuthenticated;
      const [overall, coreOverall, core, plugins] = await firstValueFrom(combinedStatus$);

      const responseBody = redactedStatus
        ? getRedactedStatusResponse({ coreOverall })
        : await getFullStatusResponse({
            incrementUsageCounter,
            config,
            query: req.query,
            metrics,
            statuses: { overall, core, plugins },
          });

      const statusCode = coreOverall.level >= ServiceStatusLevels.unavailable ? 503 : 200;
      return res.custom({ body: responseBody, statusCode, bypassErrorFormat: true });
    }
  );
};

const getFullStatusResponse = async ({
  config,
  incrementUsageCounter,
  metrics,
  statuses: { plugins, overall, core },
  query: { v7format = false, v8format = true },
}: {
  config: Deps['config'];
  incrementUsageCounter: CoreIncrementUsageCounter;
  metrics: MetricsServiceSetup;
  statuses: {
    overall: ServiceStatus<unknown>;
    core: CoreStatus;
    plugins: Record<string, ServiceStatus<unknown>>;
  };
  query: { v8format?: boolean; v7format?: boolean };
}): Promise<StatusHttpBody> => {
  const { version, buildSha, buildNum, buildDate } = config.packageInfo;
  const versionWithoutSnapshot = version.replace(SNAPSHOT_POSTFIX, '');

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
      build_date: buildDate.toISOString(),
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
      elasticsearch_client: lastMetrics.elasticsearch_client,
    },
  };

  return body;
};

const getRedactedStatusResponse = ({
  coreOverall,
}: {
  coreOverall: ServiceStatus;
}): RedactedStatusHttpBody => {
  const body: RedactedStatusHttpBody = {
    status: {
      overall: {
        level: coreOverall.level,
      },
    },
  };
  return body;
};
