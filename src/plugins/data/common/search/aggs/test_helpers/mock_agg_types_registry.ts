/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';

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
    'query:queryString:options': {},
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
