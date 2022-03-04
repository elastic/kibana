/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { KBN_FIELD_TYPES } from '../../../../common';
import { AggTypesDependencies } from '../agg_types';
import { BaseAggParams } from '../types';

import { MetricAggType } from './metric_agg_type';
import { getResponseAggConfigClass } from './lib/get_response_agg_config_class';
import type { IResponseAggConfig } from './lib/get_response_agg_config_class';
import { aggPercentileRanksFnName } from './percentile_ranks_fn';
import { getPercentileValue } from './percentiles_get_value';
import { METRIC_TYPES } from './metric_agg_types';

export interface AggParamsPercentileRanks extends BaseAggParams {
  field: string;
  values?: number[];
}

// required by the values editor
export type IPercentileRanksAggConfig = IResponseAggConfig;

export interface PercentileRanksMetricAggDependencies {
  getFieldFormatsStart: AggTypesDependencies['getFieldFormatsStart'];
}

const getValueProps = (
  getFieldFormatsStart: PercentileRanksMetricAggDependencies['getFieldFormatsStart']
) => {
  return {
    makeLabel(this: IPercentileRanksAggConfig) {
      const { getDefaultInstance } = getFieldFormatsStart();
      const field = this.getField();
      const format = (field && field.format) || getDefaultInstance(KBN_FIELD_TYPES.NUMBER);
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
  getFieldFormatsStart,
}: PercentileRanksMetricAggDependencies) => {
  return new MetricAggType<IPercentileRanksAggConfig>({
    name: METRIC_TYPES.PERCENTILE_RANKS,
    expressionName: aggPercentileRanksFnName,
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
      const ValueAggConfig = getResponseAggConfigClass(agg, getValueProps(getFieldFormatsStart));
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
