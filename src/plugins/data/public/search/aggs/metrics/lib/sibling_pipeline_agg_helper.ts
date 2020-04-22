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

import { identity } from 'lodash';
import { i18n } from '@kbn/i18n';
import { siblingPipelineAggWriter } from './sibling_pipeline_agg_writer';
import { forwardModifyAggConfigOnSearchRequestStart } from './nested_agg_helpers';
import { IMetricAggConfig, MetricAggParam } from '../metric_agg_type';
import { FieldFormat } from '../../../../../common';

const metricAggFilter: string[] = [
  '!top_hits',
  '!percentiles',
  '!percentile_ranks',
  '!median',
  '!std_dev',
  '!sum_bucket',
  '!avg_bucket',
  '!min_bucket',
  '!max_bucket',
  '!derivative',
  '!moving_avg',
  '!serial_diff',
  '!cumulative_sum',
  '!geo_bounds',
  '!geo_centroid',
];
const bucketAggFilter: string[] = [];

export const siblingPipelineType = i18n.translate(
  'data.search.aggs.metrics.siblingPipelineAggregationsSubtypeTitle',
  {
    defaultMessage: 'Sibling pipeline aggregations',
  }
);

export const siblingPipelineAggHelper = {
  subtype: siblingPipelineType,
  params() {
    return [
      {
        name: 'customBucket',
        type: 'agg',
        allowedAggs: bucketAggFilter,
        default: null,
        makeAgg(agg: IMetricAggConfig, state = { type: 'date_histogram' }) {
          const orderAgg = agg.aggConfigs.createAggConfig(state, { addToAggConfigs: false });
          orderAgg.id = agg.id + '-bucket';
          return orderAgg;
        },
        modifyAggConfigOnSearchRequestStart: forwardModifyAggConfigOnSearchRequestStart(
          'customBucket'
        ),
        write: () => {},
      },
      {
        name: 'customMetric',
        type: 'agg',
        allowedAggs: metricAggFilter,
        default: null,
        makeAgg(agg: IMetricAggConfig, state = { type: 'count' }) {
          const orderAgg = agg.aggConfigs.createAggConfig(state, { addToAggConfigs: false });
          orderAgg.id = agg.id + '-metric';
          return orderAgg;
        },
        modifyAggConfigOnSearchRequestStart: forwardModifyAggConfigOnSearchRequestStart(
          'customMetric'
        ),
        write: siblingPipelineAggWriter,
      },
    ] as Array<MetricAggParam<IMetricAggConfig>>;
  },

  getFormat(agg: IMetricAggConfig) {
    const customMetric = agg.getParam('customMetric');
    return customMetric
      ? customMetric.type.getFormat(customMetric)
      : new (FieldFormat.from(identity))();
  },
};
