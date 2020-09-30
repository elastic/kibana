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

import { fieldFormatsMock } from '../../../field_formats/mocks';

import { AggTypesRegistry, AggTypesRegistryStart } from '../agg_types_registry';
import { AggTypesDependencies, getAggTypes } from '../agg_types';
import { TimeBucketsConfig } from '../buckets/lib/time_buckets/time_buckets';

// Mocked uiSettings shared among aggs unit tests
const mockGetConfig = jest.fn().mockImplementation((key: string) => {
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

/** @internal */
export function mockGetFieldFormatsStart() {
  const { deserialize, getDefaultInstance } = fieldFormatsMock;
  return {
    deserialize,
    getDefaultInstance,
  };
}

/** @internal */
export const mockAggTypesDependencies: AggTypesDependencies = {
  calculateBounds: jest.fn(),
  getFieldFormatsStart: mockGetFieldFormatsStart,
  getConfig: mockGetConfig,
  isDefaultTimezone: () => true,
};

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
export function mockAggTypesRegistry(deps?: AggTypesDependencies): AggTypesRegistryStart {
  const registry = new AggTypesRegistry();
  const initializedAggTypes = new Map();
  const registrySetup = registry.setup();

  const aggTypes = getAggTypes();

  aggTypes.buckets.forEach(({ name, fn }) => registrySetup.registerBucket(name, fn));
  aggTypes.metrics.forEach(({ name, fn }) => registrySetup.registerMetric(name, fn));

  const registryStart = registry.start();

  // initialize each agg type and store in memory
  registryStart.getAll().buckets.forEach((type) => {
    const agg = type(deps ?? mockAggTypesDependencies);
    initializedAggTypes.set(agg.name, agg);
  });
  registryStart.getAll().metrics.forEach((type) => {
    const agg = type(deps ?? mockAggTypesDependencies);
    initializedAggTypes.set(agg.name, agg);
  });

  return {
    get: (name: string) => {
      return initializedAggTypes.get(name);
    },
    getAll: () => {
      return {
        buckets: Array.from(initializedAggTypes.values()).filter((agg) => agg.type === 'buckets'),
        metrics: Array.from(initializedAggTypes.values()).filter((agg) => agg.type === 'metrics'),
      };
    },
  };
}
