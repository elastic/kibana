/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import defaultsDeep from 'lodash/defaultsDeep';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

import {
  ElasticsearchClient,
  IRouter,
  ISavedObjectsRepository,
  KibanaRequest,
  LegacyAPICaller,
  MetricsServiceSetup,
  SavedObjectsClientContract,
  ServiceStatus,
  ServiceStatusLevels,
} from '../../../../../core/server';
import { CollectorSet } from '../../collector';

const STATS_NOT_READY_MESSAGE = i18n.translate('usageCollection.stats.notReadyMessage', {
  defaultMessage: 'Stats are not ready yet. Please try again later.',
});

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
  collectorSet: CollectorSet;
  metrics: MetricsServiceSetup;
  overallStatus$: Observable<ServiceStatus>;
}) {
  const getUsage = async (
    callCluster: LegacyAPICaller,
    esClient: ElasticsearchClient,
    savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository,
    kibanaRequest: KibanaRequest
  ): Promise<any> => {
    const usage = await collectorSet.bulkFetchUsage(
      callCluster,
      esClient,
      savedObjectsClient,
      kibanaRequest
    );
    return collectorSet.toObject(usage);
  };

  const getClusterUuid = async (asCurrentUser: ElasticsearchClient): Promise<string> => {
    const { body } = await asCurrentUser.info({ filter_path: 'cluster_uuid' });
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
        const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
        const { asCurrentUser } = context.core.elasticsearch.client;
        const savedObjectsClient = context.core.savedObjects.client;

        if (shouldGetUsage) {
          const collectorsReady = await collectorSet.areAllCollectorsReady();
          if (!collectorsReady) {
            return res.customError({ statusCode: 503, body: { message: STATS_NOT_READY_MESSAGE } });
          }
        }

        const usagePromise = shouldGetUsage
          ? getUsage(callCluster, asCurrentUser, savedObjectsClient, req)
          : Promise.resolve({});
        const [usage, clusterUuid] = await Promise.all([
          usagePromise,
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
          }, {} as any);

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
      const { collected_at: collectedAt, ...lastMetrics } = await metrics
        .getOpsMetrics$()
        .pipe(first())
        .toPromise();

      const overallStatus = await overallStatus$.pipe(first()).toPromise();
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
