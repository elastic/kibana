/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import defaultsDeep from 'lodash/defaultsDeep';
import { firstValueFrom, Observable } from 'rxjs';

import {
  ElasticsearchClient,
  IRouter,
  MetricsServiceSetup,
  SavedObjectsClientContract,
  ServiceStatus,
  ServiceStatusLevels,
} from '@kbn/core/server';
import { CollectorSet } from '../../collector';
const SNAPSHOT_REGEX = /-snapshot/i;

interface UsageObject {
  kibana?: UsageObject;
  xpack?: UsageObject;
  [key: string]: unknown | UsageObject;
}

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
  collectorSet: CollectorSet;
  metrics: MetricsServiceSetup;
  overallStatus$: Observable<ServiceStatus>;
}) {
  const getUsage = async (
    esClient: ElasticsearchClient,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<UsageObject> => {
    const usage = await collectorSet.bulkFetchUsage(esClient, savedObjectsClient);
    return collectorSet.toObject(usage);
  };

  const getClusterUuid = async (asCurrentUser: ElasticsearchClient): Promise<string> => {
    const body = await asCurrentUser.info({ filter_path: 'cluster_uuid' });
    const { cluster_uuid: uuid } = body;
    return uuid;
  };

  router.get(
    {
      path: '/api/stats',
      options: {
        authRequired: !config.allowAnonymous,
        tags: ['api'], // ensures that unauthenticated calls receive a 401 rather than a 302 redirect to login page
      },
      validate: {
        query: schema.object({
          extended: schema.oneOf([schema.literal(''), schema.boolean()], { defaultValue: false }),
          legacy: schema.oneOf([schema.literal(''), schema.boolean()], { defaultValue: false }),
          exclude_usage: schema.oneOf([schema.literal(''), schema.boolean()], {
            defaultValue: false,
          }),
        }),
      },
    },
    async (context, req, res) => {
      const isExtended = req.query.extended === '' || req.query.extended;
      const isLegacy = req.query.legacy === '' || req.query.legacy;
      const shouldGetUsage = req.query.exclude_usage === false;

      let extended;
      if (isExtended) {
        const core = await context.core;
        const { asCurrentUser } = core.elasticsearch.client;
        const savedObjectsClient = core.savedObjects.client;

        const [usage, clusterUuid] = await Promise.all([
          shouldGetUsage
            ? getUsage(asCurrentUser, savedObjectsClient)
            : Promise.resolve<UsageObject>({}),
          getClusterUuid(asCurrentUser),
        ]);

        let modifiedUsage = usage;
        if (isLegacy) {
          // In an effort to make telemetry more easily augmented, we need to ensure
          // we can passthrough the data without every part of the process needing
          // to know about the change; however, to support legacy use cases where this
          // wasn't true, we need to be backwards compatible with how the legacy data
          // looked and support those use cases here.
          modifiedUsage = Object.keys(usage).reduce((accum, usageKey) => {
            if (usageKey === 'kibana') {
              accum = {
                ...accum,
                ...usage[usageKey],
              };
            } else if (usageKey === 'reporting') {
              accum = {
                ...accum,
                xpack: {
                  ...accum.xpack,
                  reporting: usage[usageKey],
                },
              };
            } else {
              // I don't think we need to it this for the above conditions, but do it for most as it will
              // match the behavior done in monitoring/bulk_uploader
              defaultsDeep(accum, { [usageKey]: usage[usageKey] });
            }

            return accum;
          }, {} as UsageObject);

          extended = {
            usage: modifiedUsage,
            clusterUuid,
          };
        } else {
          extended = collectorSet.toApiFieldNames({
            usage: modifiedUsage,
            clusterUuid,
          });
        }
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

      return res.ok({
        body: {
          ...kibanaStats,
          ...extended,
        },
      });
    }
  );
}

const ServiceStatusToLegacyState: Record<string, string> = {
  [ServiceStatusLevels.critical.toString()]: 'red',
  [ServiceStatusLevels.unavailable.toString()]: 'red',
  [ServiceStatusLevels.degraded.toString()]: 'yellow',
  [ServiceStatusLevels.available.toString()]: 'green',
};
