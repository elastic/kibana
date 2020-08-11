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
import { getResponseAggConfigClass, IResponseAggConfig } from './lib/get_response_agg_config_class';
import { getPercentileValue } from './percentiles_get_value';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../../../common';
import { GetInternalStartServicesFn } from '../../../types';
import { BaseAggParams } from '../types';

export interface AggParamsPercentileRanks extends BaseAggParams {
  field: string;
  values?: number[];
}

// required by the values editor
export type IPercentileRanksAggConfig = IResponseAggConfig;

export interface PercentileRanksMetricAggDependencies {
  getInternalStartServices: GetInternalStartServicesFn;
}

const getValueProps = (getInternalStartServices: GetInternalStartServicesFn) => {
  return {
    makeLabel(this: IPercentileRanksAggConfig) {
      const { fieldFormats } = getInternalStartServices();
      const field = this.getField();
      const format =
        (field && field.format) || fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.NUMBER);
      const customLabel = this.getParam('customLabel');
      const label = customLabel || this.getFieldDisplayName();

      return i18n.translate('data.search.aggs.metrics.percentileRanks.valuePropsLabel', {
        defaultMessage: 'Percentile rank {format} of "{label}"',
        values: { format: format.convert(this.key, 'text'), label },
      });
    },
  };
};

export const getPercentileRanksMetricAgg = ({
  getInternalStartServices,
}: PercentileRanksMetricAggDependencies) => {
  return new MetricAggType<IPercentileRanksAggConfig>({
    name: METRIC_TYPES.PERCENTILE_RANKS,
    title: i18n.translate('data.search.aggs.metrics.percentileRanksTitle', {
      defaultMessage: 'Percentile Ranks',
    }),
    makeLabel(agg) {
      return i18n.translate('data.search.aggs.metrics.percentileRanksLabel', {
        defaultMessage: 'Percentile ranks of {field}',
        values: { field: agg.getFieldDisplayName() },
      });
    },
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.HISTOGRAM],
      },
      {
        name: 'values',
        default: [],
      },
      {
        write(agg, output) {
          output.params.keyed = false;
        },
      },
    ],
    getResponseAggs(agg) {
      const ValueAggConfig = getResponseAggConfigClass(
        agg,
        getValueProps(getInternalStartServices)
      );
      const values = agg.getParam('values');

      return values.map((value: any) => new ValueAggConfig(value));
    },
    getSerializedFormat(agg) {
      return {
        id: 'percent',
      };
    },
    getValue(agg, bucket) {
      return getPercentileValue(agg, bucket) / 100;
    },
  });
};
