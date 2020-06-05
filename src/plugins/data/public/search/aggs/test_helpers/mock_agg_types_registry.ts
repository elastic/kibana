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

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { AggTypesRegistry, AggTypesRegistryStart } from '../agg_types_registry';
import { getAggTypes } from '../agg_types';
import { BucketAggType } from '../buckets/_bucket_agg_type';
import { MetricAggType } from '../metrics/metric_agg_type';

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
    const aggTypes = getAggTypes({ uiSettings: coreMock.createSetup().uiSettings });
    aggTypes.buckets.forEach((type) => registrySetup.registerBucket(type));
    aggTypes.metrics.forEach((type) => registrySetup.registerMetric(type));
  }

  return registry.start();
}
