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

import { noop } from 'lodash';
import { i18n } from '@kbn/i18n';
import { MetricAggType, IMetricAggConfig } from './metric_agg_type';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams } from '../types';

export interface AggParamsPositiveGrowth extends BaseAggParams {
  buckets_path: string;
  customMetric?: AggConfigSerialized;
  metricAgg?: string;
}

const positiveGrowthTitle = i18n.translate('data.search.aggs.metrics.positiveGrowthTitle', {
  defaultMessage: 'Positive Growth',
});

const positiveGrowthLabel = i18n.translate('data.search.aggs.metrics.positiveGrowthLabel', {
  defaultMessage: 'positive growth',
});

export const getPositiveGrowthMetricAgg = () => {
  const { subtype, params, getSerializedFormat } = parentPipelineAggHelper;

  return new MetricAggType({
    name: METRIC_TYPES.POSITIVE_GROWTH,
    title: positiveGrowthTitle,
    makeLabel: (agg) => makeNestedLabel(agg, positiveGrowthLabel),
    subtype,
    dslName: 'bucket_script',
    params: [
      {
        name: 'field',
        type: 'field',
        write: noop,
      },
      {
        name: 'metricAgg',
        default: 'custom',
        write: noop,
      },
      {
        name: 'customMetric',
        type: 'agg',
        default: null,
        makeAgg(agg, state) {
          const count = agg.aggConfigs.createAggConfig(
            { type: 'count' },
            { addToAggConfigs: false }
          );
          return count;
        },
        write(aggConfig, output, aggConfigs) {
          if (aggConfig.getParam('field')) {
            const maxBucket = aggConfig.aggConfigs.createAggConfig(
              {
                type: 'max',
                params: {
                  field: aggConfig.getParam('field'),
                },
              },
              { addToAggConfigs: true }
            );
            maxBucket.id = aggConfig.id + '-max';
          } else {
            const countBucket = aggConfig.aggConfigs.createAggConfig(
              { type: 'count ' },
              { addToAggConfigs: true }
            );
            countBucket.id = aggConfig.id + '-max';
          }
        },
      },
      {
        name: 'requiredDerivative',
        type: 'agg',
        default: null,
        makeAgg: (agg, state) => {
          const count = agg.aggConfigs.createAggConfig(
            {
              type: 'count',
            },
            { addToAggConfigs: false }
          );
          return count;
        },
        write(aggConfig, output) {
          const derivativeBucket = aggConfig.aggConfigs.createAggConfig(
            {
              type: 'derivative',
              params: {
                customMetric: aggConfig.aggConfigs.getRequestAggById(aggConfig.id + '-max'),
              },
            },
            { addToAggConfigs: false }
          );
          derivativeBucket.id = aggConfig.id + '-deriv';
          output.parentAggs = (output.parentAggs || []).concat(derivativeBucket);

          output.params = {
            buckets_path: {
              value: derivativeBucket.id,
            },
          };
        },
      },
      {
        name: 'script',
        write(aggConfig, output, aggConfigs) {
          output.params = {
            buckets_path: {
              value: aggConfig.id + '-deriv',
            },
          };
          output.params.script = {
            source: 'params.value > 0.0 ? params.value : 0.0',
            lang: 'painless',
          };
        },
      },
    ],
    getSerializedFormat,
    getValue(agg, bucket) {
      return bucket[agg.id] ? bucket[agg.id].value : 0;
    },
  });
};
