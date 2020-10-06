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
  ISavedObjectsRepository,
  SavedObjectAttributes,
  SavedObjectsServiceSetup,
} from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
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
