/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ISavedObjectsRepository, SavedObjectsServiceSetup } from '@kbn/core/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { uiMetricSchema } from './schema';

interface UIMetricsSavedObjects {
  count: number;
}

interface UIMetricElement {
  key: string;
  value: number;
}

export type UIMetricUsage = Record<string, UIMetricElement[]>;

export function registerUiMetricUsageCollector(
  usageCollection: UsageCollectionSetup,
  registerType: SavedObjectsServiceSetup['registerType'],
  getSavedObjectsClient: () => ISavedObjectsRepository | undefined
) {
  registerType({
    name: 'ui-metric',
    hidden: false,
    namespaceType: 'agnostic',
    mappings: {
      properties: {
        count: {
          type: 'integer',
        },
      },
    },
  });

  const collector = usageCollection.makeUsageCollector<UIMetricUsage | undefined>({
    type: 'ui_metric',
    schema: uiMetricSchema,
    fetch: async () => {
      const savedObjectsClient = getSavedObjectsClient();
      if (typeof savedObjectsClient === 'undefined') {
        return;
      }

      const finder = savedObjectsClient.createPointInTimeFinder<UIMetricsSavedObjects>({
        type: 'ui-metric',
        fields: ['count'],
        perPage: 1000,
      });

      const uiMetricsByAppName: UIMetricUsage = {};

      for await (const { saved_objects: rawUiMetrics } of finder.find()) {
        rawUiMetrics.forEach((rawUiMetric) => {
          const {
            id,
            attributes: { count },
          } = rawUiMetric;

          const [appName, ...metricType] = id.split(':');

          const pair = { key: metricType.join(':'), value: count };

          uiMetricsByAppName[appName] = [...(uiMetricsByAppName[appName] || []), pair];
        });
      }

      return uiMetricsByAppName;
    },
    isReady: () => typeof getSavedObjectsClient() !== 'undefined',
  });

  usageCollection.registerCollector(collector);
}
