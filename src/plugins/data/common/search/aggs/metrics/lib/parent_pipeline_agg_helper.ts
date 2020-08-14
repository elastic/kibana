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

import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';

import { forwardModifyAggConfigOnSearchRequestStart } from './nested_agg_helpers';
import { IMetricAggConfig, MetricAggParam } from '../metric_agg_type';
import { parentPipelineAggWriter } from './parent_pipeline_agg_writer';

const metricAggFilter = [
  '!top_hits',
  '!percentiles',
  '!percentile_ranks',
  '!median',
  '!std_dev',
  '!geo_bounds',
  '!geo_centroid',
];

export const parentPipelineType = i18n.translate(
  'data.search.aggs.metrics.parentPipelineAggregationsSubtypeTitle',
  {
    defaultMessage: 'Parent Pipeline Aggregations',
  }
);

export const parentPipelineAggHelper = {
  subtype: parentPipelineType,
  params() {
    return [
      {
        name: 'metricAgg',
        default: 'custom',
        write: parentPipelineAggWriter,
      },
      {
        name: 'customMetric',
        type: 'agg',
        allowedAggs: metricAggFilter,
        makeAgg(termsAgg, state = { type: 'count' }) {
          const metricAgg = termsAgg.aggConfigs.createAggConfig(state, { addToAggConfigs: false });
          metricAgg.id = termsAgg.id + '-metric';
          return metricAgg;
        },
        modifyAggConfigOnSearchRequestStart: forwardModifyAggConfigOnSearchRequestStart(
          'customMetric'
        ),
        write: noop,
      },
      {
        name: 'buckets_path',
        write: noop,
      },
    ] as Array<MetricAggParam<IMetricAggConfig>>;
  },

  getSerializedFormat(agg: IMetricAggConfig) {
    let subAgg;
    const customMetric = agg.getParam('customMetric');

    if (customMetric) {
      subAgg = customMetric;
    } else {
      subAgg = agg.aggConfigs.byId(agg.getParam('metricAgg'));
    }
    return subAgg ? subAgg.type.getSerializedFormat(subAgg) : {};
  },
};
