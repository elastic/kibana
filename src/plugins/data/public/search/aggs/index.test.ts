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

import { coreMock } from '../../../../../../src/core/public/mocks';
import { getAggTypes } from './index';

import { isBucketAggType } from './buckets/bucket_agg_type';
import { isMetricAggType } from './metrics/metric_agg_type';
import { FieldFormatsStart } from '../../field_formats';
import { InternalStartServices } from '../../types';

describe('AggTypesComponent', () => {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createSetup();

  const aggTypes = getAggTypes({
    calculateBounds: jest.fn(),
    getInternalStartServices: () =>
      (({
        notifications: coreStart.notifications,
        fieldFormats: {} as FieldFormatsStart,
      } as unknown) as InternalStartServices),
    uiSettings: coreSetup.uiSettings,
  });

  const { buckets, metrics } = aggTypes;

  describe('bucket aggs', () => {
    test('all extend BucketAggType', () => {
      buckets.forEach((bucketAgg) => {
        expect(isBucketAggType(bucketAgg)).toBeTruthy();
      });
    });
  });

  describe('metric aggs', () => {
    test('all extend MetricAggType', () => {
      metrics.forEach((metricAgg) => {
        expect(isMetricAggType(metricAgg)).toBeTruthy();
      });
    });
  });
});
