/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggSinglePercentileRankFnName } from './single_percentile_rank_fn';
import { MetricAggType } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';
import type { IResponseAggConfig } from './lib/get_response_agg_config_class';
import { KBN_FIELD_TYPES } from '../../..';
import { BaseAggParams } from '../types';

const singlePercentileTitle = i18n.translate('data.search.aggs.metrics.singlePercentileRankTitle', {
  defaultMessage: 'Percentile rank',
});

export interface AggParamsSinglePercentileRank extends BaseAggParams {
  field: string;
  value: number;
}

export const getSinglePercentileRankMetricAgg = () => {
  return new MetricAggType<IResponseAggConfig>({
    name: METRIC_TYPES.SINGLE_PERCENTILE_RANK,
    expressionName: aggSinglePercentileRankFnName,
    dslName: 'percentile_ranks',
    title: singlePercentileTitle,
    valueType: 'number',
    makeLabel(aggConfig) {
      return i18n.translate('data.search.aggs.metrics.singlePercentileRankLabel', {
        defaultMessage: 'Percentile rank of {field}',
        values: { field: aggConfig.getFieldDisplayName() },
      });
    },
    getValueBucketPath(aggConfig) {
      return `${aggConfig.id}.${aggConfig.params.value}`;
    },
    getSerializedFormat(agg) {
      return {
        id: 'percent',
      };
    },
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.HISTOGRAM],
      },
      {
        name: 'value',
        default: 0,
        write: (agg, output) => {
          output.params.values = [agg.params.value];
        },
      },
    ],
    getValue(agg, bucket) {
      let valueKey = String(agg.params.value);
      if (Number.isInteger(agg.params.value)) {
        valueKey += '.0';
      }
      const { values } = bucket[agg.id] ?? {};
      return values ? values[valueKey] / 100 : NaN;
    },
  });
};
