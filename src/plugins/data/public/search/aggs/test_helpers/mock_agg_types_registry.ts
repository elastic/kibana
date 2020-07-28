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

import { coreMock } from '../../../../../../../src/core/public/mocks';
import { AggTypesRegistry, AggTypesRegistryStart } from '../agg_types_registry';
import { getAggTypes } from '../agg_types';
import { BucketAggType } from '../buckets/bucket_agg_type';
import { MetricAggType } from '../metrics/metric_agg_type';
import { fieldFormatsServiceMock } from '../../../field_formats/mocks';
import { InternalStartServices } from '../../../types';
import { TimeBucketsConfig } from '../buckets/lib/time_buckets/time_buckets';

// Mocked uiSettings shared among aggs unit tests
const mockUiSettings = jest.fn().mockImplementation((key: string) => {
  const config: TimeBucketsConfig = {
    'histogram:maxBars': 4,
    'histogram:barTarget': 3,
    dateFormat: 'YYYY-MM-DD',
    'dateFormat:scaled': [
      ['', 'HH:mm:ss.SSS'],
      ['PT1S', 'HH:mm:ss'],
      ['PT1M', 'HH:mm'],
      ['PT1H', 'YYYY-MM-DD HH:mm'],
      ['P1DT', 'YYYY-MM-DD'],
      ['P1YT', 'YYYY'],
    ],
  };
  return config[key] ?? key;
});

/**
 * Testing utility which creates a new instance of AggTypesRegistry,
 * registers the provided agg types, and returns AggTypesRegistry.start()
 *
 * This is useful if your test depends on a certain agg type to be present
 * in the registry.
 *
 * @param [types] - Optional array of AggTypes to register.
 * If no value is provided, all default types will be registered.
 *
 * @internal
 */
export function mockAggTypesRegistry<T extends BucketAggType<any> | MetricAggType<any>>(
  types?: T[]
): AggTypesRegistryStart {
  const registry = new AggTypesRegistry();
  const registrySetup = registry.setup();

  if (types) {
    types.forEach((type) => {
      if (type instanceof BucketAggType) {
        registrySetup.registerBucket(type);
      } else if (type instanceof MetricAggType) {
        registrySetup.registerMetric(type);
      }
    });
  } else {
    const coreSetup = coreMock.createSetup();
    coreSetup.uiSettings.get = mockUiSettings;

    const aggTypes = getAggTypes({
      calculateBounds: jest.fn(),
      getInternalStartServices: () =>
        (({
          fieldFormats: fieldFormatsServiceMock.createStartContract(),
        } as unknown) as InternalStartServices),
      uiSettings: coreSetup.uiSettings,
    });

    aggTypes.buckets.forEach((type) => registrySetup.registerBucket(type));
    aggTypes.metrics.forEach((type) => registrySetup.registerMetric(type));
  }

  return registry.start();
}
