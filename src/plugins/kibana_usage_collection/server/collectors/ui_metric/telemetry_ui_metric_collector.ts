/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ISavedObjectsRepository,
  SavedObjectAttributes,
  SavedObjectsServiceSetup,
} from '@kbn/core/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { uiMetricSchema } from './schema';

interface UIMetricsSavedObjects extends SavedObjectAttributes {
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

      const { saved_objects: rawUiMetrics } = await savedObjectsClient.find<UIMetricsSavedObjects>({
        type: 'ui-metric',
        fields: ['count'],
        perPage: 10000,
      });

      const uiMetricsByAppName = rawUiMetrics.reduce((accum, rawUiMetric) => {
        const {
          id,
          attributes: { count },
        } = rawUiMetric;

        const [appName, ...metricType] = id.split(':');

        const pair = { key: metricType.join(':'), value: count };
        return {
          ...accum,
          [appName]: [...(accum[appName] || []), pair],
        };
      }, {} as UIMetricUsage);

      return uiMetricsByAppName;
    },
    isReady: () => typeof getSavedObjectsClient() !== 'undefined',
  });

  usageCollection.registerCollector(collector);
}
