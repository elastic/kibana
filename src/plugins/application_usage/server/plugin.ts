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

import {
  Plugin,
  CoreSetup,
  CoreStart,
  IRouter,
  IClusterClient,
  ISavedObjectsRepository,
  PluginInitializerContext,
  Logger,
  SavedObjectAttributes,
} from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { SearchResponse } from 'elasticsearch';

/**
 * Roll indices every 24h
 */
const ROLL_INDICES_INTERVAL = 24 * 60 * 60 * 1000;

/**
 * Set index to store the time-based records
 */
const INDEX_APP_USAGE = '.kibana-application-usage';

/**
 * Plugin type: used for saved objects and telemetry
 */
const PLUGIN_TYPE = 'application_usage';

export interface ApplicationUsageTelemetryReport {
  [appId: string]: {
    clicks_total: number;
    clicks_30_days: number;
    clicks_90_days: number;
    minutes_on_screen_total: number;
    minutes_on_screen_30_days: number;
    minutes_on_screen_90_days: number;
  };
}

export interface ApplicationUsagePluginDepsSetup {
  usageCollection?: UsageCollectionSetup;
}

interface ApplicationUsageSavedObject extends SavedObjectAttributes {
  appId: string;
  minutesOnScreen: number;
  numberOfClicks: number;
}

interface SearchAggregationBucket {
  key: string;
  doc_count: number;
  perDay: {
    buckets: {
      [key in 'last30Days' | 'last90Days' | 'total']: {
        doc_count: number;
        minutesOnScreen: { value: number };
        numberOfClicks: { value: number };
      };
    };
  };
}

interface SearchAggregationResult extends SearchResponse<void> {
  aggregations?: {
    appId: {
      buckets: SearchAggregationBucket[];
    };
  };
}

export class ApplicationUsagePlugin implements Plugin<void, void> {
  private readonly log: Logger;
  private intervalId?: NodeJS.Timer;
  private esClient?: IClusterClient;
  private savedObjectsClient?: ISavedObjectsRepository;
  private indexTemplateInitialised = false;

  constructor({ logger }: PluginInitializerContext) {
    this.log = logger.get();
  }

  public async setup(
    { http, elasticsearch }: CoreSetup,
    { usageCollection }: ApplicationUsagePluginDepsSetup
  ) {
    const router = http.createRouter();
    this.registerIndexRoute(router);

    this.esClient = elasticsearch.adminClient;
    try {
      await this.ensureIndex(this.esClient);
    } catch (err) {
      // If I don't catch this, I'll get errors in core_services.test.ts tests :o
      this.log.warn(
        `Failed to ensure the index. I'll try again later when I need to store any info.`
      );
    }

    if (usageCollection) {
      const usageCollector = usageCollection.makeUsageCollector({
        isReady: () => true,
        type: PLUGIN_TYPE,
        fetch: callCluster => this.fetchUsage(callCluster),
      });
      usageCollection.registerCollector(usageCollector);
    }
  }

  public async start({ savedObjects }: CoreStart) {
    const savedObjectsClient = (this.savedObjectsClient = savedObjects.createInternalRepository());
    this.intervalId = setInterval(
      () => this.esClient && this.rollTotals(this.esClient, savedObjectsClient),
      ROLL_INDICES_INTERVAL
    );
    this.rollTotals(this.esClient!, savedObjectsClient);
  }

  public stop() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private registerIndexRoute(router: IRouter) {
    router.post(
      {
        path: '/api/application-usage',
        validate: {
          body: schema.object({
            usage: schema.arrayOf(
              schema.object({
                appId: schema.string(),
                numberOfClicks: schema.number(),
                minutesOnScreen: schema.number(),
              })
            ),
          }),
        },
      },
      async (context, req, res) => {
        const { usage } = req.body;
        const now = new Date().toISOString();
        const _index = INDEX_APP_USAGE;
        if (this.indexTemplateInitialised === false) await this.ensureIndex(this.esClient!);
        await context.core.elasticsearch.dataClient.callAsInternalUser('bulk', {
          body: usage.reduce(
            (acc, { appId, numberOfClicks, minutesOnScreen }) => [
              ...acc,
              { index: { _index } },
              { timestamp: now, appId, numberOfClicks, minutesOnScreen },
            ],
            [] as object[]
          ),
        });
        return res.ok();
      }
    );
  }

  private async ensureIndex(elasticsearch: IClusterClient) {
    // Skip if already done
    if (this.indexTemplateInitialised === true) return;

    const mappings = {
      properties: {
        timestamp: { type: 'date' },
        appId: { type: 'keyword' },
        numberOfClicks: { type: 'long' },
        minutesOnScreen: { type: 'float' },
      },
    };

    if (await elasticsearch.callAsInternalUser('indices.exists', { index: INDEX_APP_USAGE })) {
      await elasticsearch.callAsInternalUser('indices.putMapping', {
        index: INDEX_APP_USAGE,
        body: mappings,
      });
    } else {
      await elasticsearch.callAsInternalUser('indices.create', {
        index: INDEX_APP_USAGE,
        body: {
          settings: {
            number_of_shards: 1,
          },
          mappings,
        },
      });
    }
    this.indexTemplateInitialised = true;
  }

  private async getSavedObjectTotals() {
    if (!this.savedObjectsClient) {
      return {};
    }
    try {
      const { saved_objects } = await this.savedObjectsClient.find<ApplicationUsageSavedObject>({
        type: PLUGIN_TYPE,
        perPage: 100,
      });
      return saved_objects.reduce(
        (acc, { attributes: { appId, minutesOnScreen, numberOfClicks } }) => ({
          ...acc,
          [appId]: {
            minutesOnScreen: minutesOnScreen + (acc[appId]?.minutesOnScreen || 0),
            numberOfClicks: numberOfClicks + (acc[appId]?.numberOfClicks || 0),
          },
        }),
        {} as { [appId: string]: { minutesOnScreen: number; numberOfClicks: number } }
      );
    } catch (err) {
      if (err.output?.statusCode === 404) {
        return {};
      } else {
        throw err;
      }
    }
  }

  private async rollTotals(
    elasticsearch: IClusterClient,
    savedObjectsClient: ISavedObjectsRepository
  ) {
    try {
      // Query for everything older than 90d
      const query = { bool: { filter: { range: { timestamp: { lte: 'now-90d' } } } } };
      const { aggregations } = await this.fetchAggregation(elasticsearch.callAsInternalUser, query);

      const attributes = await this.getSavedObjectTotals();
      const newTotals = (aggregations?.appId.buckets || []).map(({ key, perDay }) => {
        const { numberOfClicks, minutesOnScreen } = attributes[key] || {
          numberOfClicks: 0,
          minutesOnScreen: 0,
        };
        return {
          appId: key,
          numberOfClicks: numberOfClicks + perDay.buckets.total.numberOfClicks.value,
          minutesOnScreen: minutesOnScreen + perDay.buckets.total.minutesOnScreen.value,
        };
      });
      if (newTotals.length === 0) {
        return;
      }
      await savedObjectsClient.bulkCreate<ApplicationUsageSavedObject>(
        newTotals.map(entry => ({
          type: PLUGIN_TYPE,
          id: entry.appId,
          attributes: entry,
        })),
        { overwrite: true }
      );
      await elasticsearch.callAsInternalUser('deleteByQuery', {
        index: INDEX_APP_USAGE,
        ignore_unavailable: true,
        allow_no_indices: true,
        body: { query },
      });
    } catch (err) {
      this.log.warn(`Failed to roll totals`, err);
    }
  }

  private async fetchAggregation(
    callCluster: IClusterClient['callAsInternalUser'],
    query: object = { match_all: {} }
  ): Promise<SearchAggregationResult> {
    const lastNDays = (numberOfDays: number) => ({
      [`last${numberOfDays}Days`]: {
        bool: {
          filter: {
            range: {
              timestamp: {
                gte: `now-${numberOfDays}d`,
                lte: 'now',
              },
            },
          },
        },
      },
    });

    const response = await callCluster('search', {
      index: INDEX_APP_USAGE,
      ignore_unavailable: true,
      allow_no_indices: true,
      body: {
        size: 0,
        query,
        aggs: {
          appId: {
            terms: {
              field: 'appId',
            },
            aggs: {
              perDay: {
                filters: {
                  filters: {
                    ...lastNDays(30),
                    ...lastNDays(90),
                    total: { match_all: {} },
                  },
                },
                aggs: {
                  numberOfClicks: { sum: { field: 'numberOfClicks' } },
                  minutesOnScreen: { sum: { field: 'minutesOnScreen' } },
                },
              },
            },
          },
        },
      },
    });
    return response || {};
  }

  private async fetchUsage(callCluster: IClusterClient['callAsInternalUser']) {
    const response = await this.fetchAggregation(callCluster);
    const totals = await this.getSavedObjectTotals();

    const usage = (response.aggregations?.appId.buckets || []).reduce(
      (acc, { key, perDay }) => ({
        ...acc,
        [key]: {
          clicks_total:
            perDay.buckets.total.numberOfClicks.value + (totals[key]?.numberOfClicks || 0),
          clicks_30_days: perDay.buckets.last30Days.numberOfClicks.value,
          clicks_90_days: perDay.buckets.last90Days.numberOfClicks.value,
          minutes_on_screen_total:
            perDay.buckets.total.minutesOnScreen.value + (totals[key]?.minutesOnScreen || 0),
          minutes_on_screen_30_days: perDay.buckets.last30Days.minutesOnScreen.value,
          minutes_on_screen_90_days: perDay.buckets.last90Days.minutesOnScreen.value,
        },
      }),
      {} as ApplicationUsageTelemetryReport
    );

    return Object.entries(totals).reduce(
      (acc, [key, { numberOfClicks, minutesOnScreen }]) => ({
        ...acc,
        [key]: acc[key] || {
          clicks_total: numberOfClicks,
          clicks_30_days: 0,
          clicks_90_days: 0,
          minutes_on_screen_total: minutesOnScreen,
          minutes_on_screen_30_days: 0,
          minutes_on_screen_90_days: 0,
        },
      }),
      usage
    );
  }
}
