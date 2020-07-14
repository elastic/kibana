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
import { MetricAggType } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../../../common';
import { getResponseAggConfigClass, IResponseAggConfig } from './lib/get_response_agg_config_class';
import { getPercentileValue } from './percentiles_get_value';
import { ordinalSuffix } from './lib/ordinal_suffix';
import { BaseAggParams } from '../types';

export interface AggParamsPercentiles extends BaseAggParams {
  field: string;
  percents?: number[];
}

export type IPercentileAggConfig = IResponseAggConfig;

const valueProps = {
  makeLabel(this: IPercentileAggConfig) {
    const customLabel = this.getParam('customLabel');
    const label = customLabel || this.getFieldDisplayName();

    return i18n.translate('data.search.aggs.metrics.percentiles.valuePropsLabel', {
      defaultMessage: '{percentile} percentile of {label}',
      values: { percentile: ordinalSuffix(this.key), label },
    });
  },
};

export const getPercentilesMetricAgg = () => {
  return new MetricAggType<IPercentileAggConfig>({
    name: METRIC_TYPES.PERCENTILES,
    title: i18n.translate('data.search.aggs.metrics.percentilesTitle', {
      defaultMessage: 'Percentiles',
    }),
    makeLabel(agg) {
      return i18n.translate('data.search.aggs.metrics.percentilesLabel', {
        defaultMessage: 'Percentiles of {field}',
        values: { field: agg.getFieldDisplayName() },
      });
    },
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.DATE, KBN_FIELD_TYPES.HISTOGRAM],
      },
      {
        name: 'percents',
        default: [1, 5, 25, 50, 75, 95, 99],
      },
      {
        write(agg, output) {
          output.params.keyed = false;
        },
      },
    ],
    getResponseAggs(agg) {
      const ValueAggConfig = getResponseAggConfigClass(agg, valueProps);

      return agg.getParam('percents').map((percent: any) => new ValueAggConfig(percent));
    },

    getValue: getPercentileValue,
  });
};
