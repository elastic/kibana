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

import _ from 'lodash';
import { AggConfig } from '../../../vis/agg_config';
import { Schemas } from '../../../vis/editors/default/schemas';

import { siblingPipelineAggController } from './sibling_pipeline_agg_controller';
import { siblingPipelineAggWriter } from './sibling_pipeline_agg_writer';
import metricAggTemplate from '../../controls/sub_metric.html';
import { forwardModifyAggConfigOnSearchRequestStart } from './nested_agg_helpers';
import { i18n } from '@kbn/i18n';

const metricAggFilter = [
  '!top_hits', '!percentiles', '!percentile_ranks', '!median', '!std_dev',
  '!sum_bucket', '!avg_bucket', '!min_bucket', '!max_bucket',
  '!derivative', '!moving_avg', '!serial_diff', '!cumulative_sum',
  '!geo_bounds', '!geo_centroid',
];

const metricAggSchema = (new Schemas([
  {
    group: 'none',
    name: 'metricAgg',
    title: i18n.translate('common.ui.aggTypes.metrics.metricAggTitle', {
      defaultMessage: 'Metric Agg'
    }),
    aggFilter: metricAggFilter
  }
])).all[0];

const bucketAggFilter = [];
const bucketAggSchema = (new Schemas([
  {
    group: 'none',
    title: i18n.translate('common.ui.aggTypes.metrics.bucketAggTitle', {
      defaultMessage: 'Bucket Agg'
    }),
    name: 'bucketAgg',
    aggFilter: bucketAggFilter
  }
])).all[0];

const siblingPipelineAggHelper = {
  subtype: i18n.translate('common.ui.aggTypes.metrics.siblingPipelineAggregationsSubtypeTitle', {
    defaultMessage: 'Sibling Pipeline Aggregations'
  }),
  params: function () {
    return [
      {
        name: 'customBucket',
        type: AggConfig,
        default: null,
        serialize: function (customMetric) {
          return customMetric.toJSON();
        },
        deserialize: function (state, agg) {
          return this.makeAgg(agg, state);
        },
        makeAgg: function (agg, state) {
          state = state || { type: 'date_histogram' };
          state.schema = bucketAggSchema;
          const orderAgg = agg.aggConfigs.createAggConfig(state, { addToAggConfigs: false });
          orderAgg.id = agg.id + '-bucket';
          return orderAgg;
        },
        editor: metricAggTemplate,
        controller: siblingPipelineAggController('customBucket'),
        modifyAggConfigOnSearchRequestStart: forwardModifyAggConfigOnSearchRequestStart('customBucket'),
        write: _.noop
      },
      {
        name: 'customMetric',
        type: AggConfig,
        default: null,
        serialize: function (customMetric) {
          return customMetric.toJSON();
        },
        deserialize: function (state, agg) {
          return this.makeAgg(agg, state);
        },
        makeAgg: function (agg, state) {
          state = state || { type: 'count' };
          state.schema = metricAggSchema;
          const orderAgg = agg.aggConfigs.createAggConfig(state, { addToAggConfigs: false });
          orderAgg.id = agg.id + '-metric';
          return orderAgg;
        },
        editor: metricAggTemplate,
        controller: siblingPipelineAggController('customMetric'),
        modifyAggConfigOnSearchRequestStart: forwardModifyAggConfigOnSearchRequestStart('customMetric'),
        write: siblingPipelineAggWriter
      }
    ];
  },
  getFormat: function (agg) {
    return agg.params.customMetric.type.getFormat(agg.params.customMetric);
  }
};

export { siblingPipelineAggHelper };
