/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { firstValueFrom, Observable } from 'rxjs';

import {
  ElasticsearchClient,
  IRouter,
  type MetricsServiceSetup,
  ServiceStatus,
  ServiceStatusLevels,
} from '@kbn/core/server';
import { ICollectorSet } from '../../collector';
import { Stats } from '../../../common/types';
const SNAPSHOT_REGEX = /-snapshot/i;

export function registerStatsRoute({
  router,
  config,
  collectorSet,
  metrics,
  overallStatus$,
}: {
  router: IRouter;
  config: {
    allowAnonymous: boolean;
    kibanaIndex: string;
    kibanaVersion: string;
    uuid: string;
    server: {
      name: string;
      hostname: string;
      port: number;
    };
  };
  collectorSet: ICollectorSet;
  metrics: MetricsServiceSetup;
  overallStatus$: Observable<ServiceStatus>;
}) {
  const getClusterUuid = async (asCurrentUser: ElasticsearchClient): Promise<string> => {
    const body = await asCurrentUser.info({ filter_path: 'cluster_uuid' });
    const { cluster_uuid: uuid } = body;
    return uuid;
  };

  router.get(
    {
      path: '/api/stats',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      options: {
        authRequired: !config.allowAnonymous,
        excludeFromRateLimiter: true,
        // The `api` tag ensures that unauthenticated calls receive a 401 rather than a 302 redirect to login page.
        // The `security:acceptJWT` tag allows route to be accessed with JWT credentials. It points to
        // ROUTE_TAG_ACCEPT_JWT from '@kbn/security-plugin/server' that cannot be imported here directly.
        tags: ['api', 'security:acceptJWT'],
        access: 'public', // needs to be public to allow access from "system" users like metricbeat.
      },
      validate: {
        query: schema.object({
          extended: schema.oneOf([schema.literal(''), schema.boolean()], { defaultValue: false }),
          legacy: schema.oneOf([schema.literal(''), schema.boolean()], { defaultValue: false }),
          exclude_usage: schema.oneOf([schema.literal(''), schema.boolean()], {
            defaultValue: true,
          }),
        }),
      },
    },
    async (context, req, res) => {
      const requestQuery: Stats.v1.StatsHTTPQuery = req.query;
      const isExtended = requestQuery.extended === '' || requestQuery.extended;
      const isLegacy = requestQuery.legacy === '' || requestQuery.legacy;

      let extended = {};
      if (isExtended) {
        const core = await context.core;
        const { asInternalUser } = core.elasticsearch.client;
        // as of https://github.com/elastic/kibana/pull/151082, usage will always be an empty object.

        const clusterUuid = await getClusterUuid(asInternalUser);
        const extendedClusterUuid = isLegacy ? { clusterUuid } : { cluster_uuid: clusterUuid };
        extended = {
          usage: {},
          ...extendedClusterUuid,
        };
      }

      // Guaranteed to resolve immediately due to replay effect on getOpsMetrics$
      const { collected_at: collectedAt, ...lastMetrics } = await firstValueFrom(
        metrics.getOpsMetrics$()
      );

      const overallStatus = await firstValueFrom(overallStatus$);
      const kibanaStats = collectorSet.toApiFieldNames({
        ...lastMetrics,
        kibana: {
          uuid: config.uuid,
          name: config.server.name,
          index: config.kibanaIndex,
          host: config.server.hostname,
          locale: i18n.getLocale(),
          transport_address: `${config.server.hostname}:${config.server.port}`,
          version: config.kibanaVersion.replace(SNAPSHOT_REGEX, ''),
          snapshot: SNAPSHOT_REGEX.test(config.kibanaVersion),
          status: ServiceStatusToLegacyState[overallStatus.level.toString()],
        },
        last_updated: collectedAt.toISOString(),
        collection_interval_in_millis: metrics.collectionInterval,
      });

      const body: Stats.v1.StatsHTTPBodyTyped = {
        ...kibanaStats,
        ...extended,
      };

      return res.ok({
        body,
      });
    }
  );
}

const ServiceStatusToLegacyState: Stats.v1.KibanaServiceStatus = {
  [ServiceStatusLevels.critical.toString()]: 'red',
  [ServiceStatusLevels.unavailable.toString()]: 'red',
  [ServiceStatusLevels.degraded.toString()]: 'yellow',
  [ServiceStatusLevels.available.toString()]: 'green',
};
