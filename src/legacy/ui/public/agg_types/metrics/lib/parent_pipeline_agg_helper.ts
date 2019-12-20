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
import { MetricAggParamEditor } from '../../../vis/editors/default/controls/metric_agg';
import { SubAggParamEditor } from '../../../vis/editors/default/controls/sub_agg';
import { forwardModifyAggConfigOnSearchRequestStart } from './nested_agg_helpers';
import { IMetricAggConfig, MetricAggParam } from '../metric_agg_type';
import { parentPipelineAggWriter } from './parent_pipeline_agg_writer';

// @ts-ignore
import { Schemas } from '../../../vis/editors/default/schemas';
import { AggGroupNames } from '../../../vis/editors/default';

const metricAggFilter = [
  '!top_hits',
  '!percentiles',
  '!percentile_ranks',
  '!median',
  '!std_dev',
  '!geo_bounds',
  '!geo_centroid',
];

const metricAggTitle = i18n.translate('common.ui.aggTypes.metrics.metricAggTitle', {
  defaultMessage: 'Metric agg',
});

const subtypeLabel = i18n.translate(
  'common.ui.aggTypes.metrics.parentPipelineAggregationsSubtypeTitle',
  {
    defaultMessage: 'Parent Pipeline Aggregations',
  }
);

const [metricAggSchema] = new Schemas([
  {
    group: AggGroupNames.None,
    name: 'metricAgg',
    title: metricAggTitle,
    hideCustomLabel: true,
    aggFilter: metricAggFilter,
  },
]).all;

export const parentPipelineAggHelper = {
  subtype: subtypeLabel,

  params() {
    return [
      {
        name: 'metricAgg',
        editorComponent: MetricAggParamEditor,
        default: 'custom',
        write: parentPipelineAggWriter,
      },
      {
        name: 'customMetric',
        editorComponent: SubAggParamEditor,
        type: 'agg',
        makeAgg(termsAgg, state: any) {
          state = state || { type: 'count' };
          state.schema = metricAggSchema;

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

  getFormat(agg: IMetricAggConfig) {
    let subAgg;
    const customMetric = agg.getParam('customMetric');

    if (customMetric) {
      subAgg = customMetric;
    } else {
      subAgg = agg.aggConfigs.byId(agg.getParam('metricAgg'));
    }
    return subAgg.type.getFormat(subAgg);
  },
};
