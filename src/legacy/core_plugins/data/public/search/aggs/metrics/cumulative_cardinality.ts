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
import { fieldFormats } from '../../../../../../../plugins/data/public';
import { MetricAggType, IMetricAggConfig, MetricAggParam } from './metric_agg_type';
import { IAggConfigs } from '../agg_configs';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../../../../../../plugins/data/public';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';

const cumulativeCardinalityTitle = i18n.translate(
  'data.search.aggs.metrics.cumulativeCardinalityTitle',
  {
    defaultMessage: 'Cumulative Unique Count',
  }
);

export const cumulativeCardinalityMetricAgg = new MetricAggType({
  name: METRIC_TYPES.CUMULATIVE_CARDINALITY,
  title: cumulativeCardinalityTitle,
  subtype: parentPipelineAggHelper.subtype,
  makeLabel: agg => {
    return i18n.translate('data.search.aggs.metrics.cumulativeUniqueCountLabel', {
      defaultMessage: 'Cumulative Unique Count of {field}',
      values: { field: agg.getParam('field')?.name },
    });
  },
  params: [
    {
      name: 'field',
      type: 'field',
      write: (
        agg: IMetricAggConfig,
        output: Record<string, any>,
        aggConfigs?: IAggConfigs
      ): void => {
        if (!aggConfigs) {
          return;
        }
        const metric = aggConfigs.createAggConfig({
          id: agg.id + '-parent',
          enabled: true,
          type: METRIC_TYPES.CARDINALITY,
          schema: 'metric',
          params: {
            field: agg.getParam('field'),
            missing: 0,
          },
        });
        output.parentAggs = (output.parentAggs || []).concat(metric);
        output.params = {
          buckets_path: metric.id,
        };
      },
    },
  ] as Array<MetricAggParam<IMetricAggConfig>>,
});
