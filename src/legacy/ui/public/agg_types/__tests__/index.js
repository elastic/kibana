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

import expect from '@kbn/expect';
import './agg_type';
import './agg_params';
import './buckets/_histogram';
import './buckets/_geo_hash';
import './buckets/_range';
import './buckets/_terms_other_bucket_helper';
import './buckets/date_histogram/_editor';
import './buckets/date_histogram/_params';
import { aggTypes } from '..';
import { BucketAggType } from '../buckets/_bucket_agg_type';
import { MetricAggType } from '../metrics/metric_agg_type';

const bucketAggs = aggTypes.buckets;
const metricAggs = aggTypes.metrics;

describe('AggTypesComponent', function() {
  describe('bucket aggs', function() {
    it('all extend BucketAggType', function() {
      bucketAggs.forEach(function(bucketAgg) {
        expect(bucketAgg).to.be.a(BucketAggType);
      });
    });
  });

  describe('metric aggs', function() {
    it('all extend MetricAggType', function() {
      metricAggs.forEach(function(metricAgg) {
        expect(metricAgg).to.be.a(MetricAggType);
      });
    });
  });
});
