/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, type Observable, combineLatest, ReplaySubject, startWith } from 'rxjs';
import { schema } from '@kbn/config-schema';
import { timingSafeEqual } from 'node:crypto';
import type { PackageInfo } from '@kbn/config';
import type { Logger } from '@kbn/logging';
import type { PluginName } from '@kbn/core-base-common';
import type { IRouter, IAuthHeadersStorage } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { MetricsServiceSetup } from '@kbn/core-metrics-server';
import { type ServiceStatus, type CoreStatus, ServiceStatusLevels } from '@kbn/core-status-common';

const SIDECAR_SECRET_HEADER = 'x-kbn-sidecar-secret';

interface SidecarRouteDeps {
  router: IRouter<RequestHandlerContext>;
  logger: Logger;
  secret: string;
  authRequestHeaders: IAuthHeadersStorage;
  config: {
    allowAnonymous: boolean;
    statusPageBypassMonitorPrivilege: boolean;
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
}

const SERVICE_UNAVAILABLE_NOT_REPORTED: ServiceStatus = {
  level: ServiceStatusLevels.unavailable,
  summary: 'Status not yet reported',
};

const validateSecret = (headerValue: string | undefined, expected: string): boolean => {
  if (!headerValue) return false;
  const a = Buffer.from(headerValue);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

export const registerSidecarRoutes = ({
  router,
  logger,
  secret,
  authRequestHeaders,
  config,
  metrics,
  status,
}: SidecarRouteDeps) => {
  const combinedStatus$ = new ReplaySubject<
    [ServiceStatus<unknown>, ServiceStatus, CoreStatus, Record<string, ServiceStatus<unknown>>]
  >(1);
  combineLatest([
    status.overall$.pipe(startWith(SERVICE_UNAVAILABLE_NOT_REPORTED)),
    status.coreOverall$.pipe(startWith(SERVICE_UNAVAILABLE_NOT_REPORTED)),
    status.core$.pipe(
      startWith<CoreStatus>({
        elasticsearch: SERVICE_UNAVAILABLE_NOT_REPORTED,
        savedObjects: SERVICE_UNAVAILABLE_NOT_REPORTED,
      })
    ),
    status.plugins$.pipe(startWith({})),
  ]).subscribe(combinedStatus$);

  // GET /internal/sidecar/status
  router.get(
    {
      path: '/internal/sidecar/status',
      security: {
        authc: { enabled: false, reason: 'Protected by sidecar secret header.' },
        authz: { enabled: false, reason: 'Protected by sidecar secret header.' },
      },
      options: {
        access: 'internal',
        excludeFromRateLimiter: true,
      },
      validate: false,
    },
    async (context, req, res) => {
      if (!validateSecret(req.headers[SIDECAR_SECRET_HEADER] as string, secret)) {
        return res.unauthorized({ body: 'Invalid sidecar secret' });
      }

      const [overall, coreOverall, core, plugins] = await firstValueFrom(combinedStatus$);
      const lastMetrics = await firstValueFrom(metrics.getOpsMetrics$());

      const { version, buildSha, buildNum, buildDate, buildFlavor } = config.packageInfo;

      return res.ok({
        body: {
          config: {
            allowAnonymous: config.allowAnonymous,
            statusPageBypassMonitorPrivilege: config.statusPageBypassMonitorPrivilege,
            serverName: config.serverName,
            uuid: config.uuid,
            packageInfo: {
              version,
              buildSha,
              buildNum,
              buildDate: buildDate.toISOString(),
              buildFlavor,
            },
          },
          coreOverall: { level: coreOverall.level.toString(), summary: coreOverall.summary },
          overall: { level: overall.level.toString(), summary: overall.summary },
          core: {
            elasticsearch: {
              level: core.elasticsearch.level.toString(),
              summary: core.elasticsearch.summary,
            },
            savedObjects: {
              level: core.savedObjects.level.toString(),
              summary: core.savedObjects.summary,
            },
          },
          plugins: Object.fromEntries(
            Object.entries(plugins).map(([name, s]) => [
              name,
              { level: s.level.toString(), summary: s.summary },
            ])
          ),
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
        },
      });
    }
  );

  // POST /internal/sidecar/authenticate
  router.post(
    {
      path: '/internal/sidecar/authenticate',
      security: {
        authc: {
          enabled: 'optional',
          reason: 'Sidecar forwards browser auth headers; auth result is returned to Go.',
        },
        authz: { enabled: false, reason: 'Protected by sidecar secret header.' },
      },
      options: {
        access: 'internal',
        tags: ['api', 'security:acceptJWT'],
        excludeFromRateLimiter: true,
      },
      validate: false,
    },
    async (context, req, res) => {
      if (!validateSecret(req.headers[SIDECAR_SECRET_HEADER] as string, secret)) {
        return res.unauthorized({ body: 'Invalid sidecar secret' });
      }

      const isAuthenticated = req.auth.isAuthenticated;

      if (!isAuthenticated) {
        return res.ok({
          body: { isAuthenticated: false },
        });
      }

      const esHeaders = authRequestHeaders.get(req) ?? {};

      return res.ok({
        body: {
          isAuthenticated: true,
          esHeaders,
        },
      });
    }
  );

  // POST /internal/sidecar/check_privileges
  router.post(
    {
      path: '/internal/sidecar/check_privileges',
      security: {
        authc: { enabled: false, reason: 'Protected by sidecar secret header.' },
        authz: { enabled: false, reason: 'Protected by sidecar secret header.' },
      },
      options: {
        access: 'internal',
        excludeFromRateLimiter: true,
      },
      validate: {
        body: schema.object({
          esHeaders: schema.recordOf(
            schema.string({ maxLength: 256 }),
            schema.string({ maxLength: 8192 })
          ),
          privileges: schema.object({
            cluster: schema.arrayOf(schema.string({ maxLength: 256 }), { maxSize: 10 }),
          }),
        }),
      },
    },
    async (context, req, res) => {
      if (!validateSecret(req.headers[SIDECAR_SECRET_HEADER] as string, secret)) {
        return res.unauthorized({ body: 'Invalid sidecar secret' });
      }

      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asInternalUser;

      try {
        const result = await esClient.security.hasPrivileges(
          { cluster: req.body.privileges.cluster },
          { headers: req.body.esHeaders }
        );
        return res.ok({
          body: { has_all_requested: result.has_all_requested },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.debug(`check_privileges failed: ${message}`);
        return res.ok({
          body: { has_all_requested: false },
        });
      }
    }
  );
};
