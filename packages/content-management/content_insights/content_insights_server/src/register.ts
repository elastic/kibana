/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import moment from 'moment';

/**
 * Configuration for the usage counter
 */
export interface ContentInsightsConfig {
  /**
   * e.g. 'dashboard'
   * passed as a domainId to usage counter apis
   */
  domainId: string;

  /**
   * Can control created routes access via access tags
   */
  routeTags?: string[];

  /**
   * Retention period in days for usage counter data
   */
  retentionPeriodDays?: number;
}

export interface ContentInsightsDependencies {
  usageCollection: UsageCollectionSetup;
  http: CoreSetup['http'];
  getStartServices: () => Promise<{
    usageCollection: UsageCollectionStart;
  }>;
}

export interface ContentInsightsStatsResponse {
  result: ContentInsightsStats;
}

export interface ContentInsightsStats {
  /**
   * The date from which the data is counted
   */
  from: string;
  /**
   * Total count of events
   */
  count: number;
  /**
   * Daily counts of events
   */
  daily: Array<{
    date: string;
    count: number;
  }>;
}

/*
 * Registers the content insights routes
 */
export const registerContentInsights = (
  { usageCollection, http, getStartServices }: ContentInsightsDependencies,
  config: ContentInsightsConfig
) => {
  const retentionPeriodDays = config.retentionPeriodDays ?? 90;
  const counter = usageCollection.createUsageCounter(config.domainId, {
    retentionPeriodDays,
  });

  const router = http.createRouter();
  const validate = {
    params: schema.object({
      id: schema.string(),
      eventType: schema.literal('viewed'),
    }),
  };
  router.post(
    {
      path: `/internal/content_management/insights/${config.domainId}/{id}/{eventType}`,
      validate,
      options: {
        tags: config.routeTags,
      },
    },
    async (context, req, res) => {
      const { id, eventType } = req.params;

      counter.incrementCounter({
        counterName: id,
        counterType: eventType,
        namespace: (await context.core).savedObjects.client.getCurrentNamespace(),
      });
      return res.ok();
    }
  );
  router.get(
    {
      path: `/internal/content_management/insights/${config.domainId}/{id}/{eventType}/stats`,
      validate,
      options: {
        tags: config.routeTags,
      },
    },
    async (context, req, res) => {
      const { id, eventType } = req.params;
      const {
        usageCollection: { search },
      } = await getStartServices();

      const startOfDay = moment.utc().startOf('day');
      const from = startOfDay.clone().subtract(retentionPeriodDays, 'days');

      const result = await search({
        filters: {
          domainId: config.domainId,
          counterName: id,
          counterType: eventType,
          namespace: (await context.core).savedObjects.client.getCurrentNamespace(),
          from: from.toISOString(),
        },
      });

      const response: ContentInsightsStatsResponse = {
        result: {
          from: from.toISOString(),
          count: result.counters[0]?.count ?? 0,
          daily: (result.counters[0]?.records ?? []).map((record) => ({
            date: record.updatedAt,
            count: record.count,
          })),
        },
      };

      return res.ok({ body: response });
    }
  );
};
