/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggSinglePercentileFnName } from './single_percentile_fn';
import { MetricAggType } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../../../common';
import { BaseAggParams } from '../types';

const singlePercentileTitle = i18n.translate('data.search.aggs.metrics.singlePercentileTitle', {
  defaultMessage: 'Percentile',
});

export interface AggParamsSinglePercentile extends BaseAggParams {
  field: string;
  percentile: number;
}

export const getSinglePercentileMetricAgg = () => {
  return new MetricAggType({
    name: METRIC_TYPES.SINGLE_PERCENTILE,
    expressionName: aggSinglePercentileFnName,
    dslName: 'percentiles',
    title: singlePercentileTitle,
    valueType: 'number',
    makeLabel(aggConfig) {
      return i18n.translate('data.search.aggs.metrics.singlePercentileLabel', {
        defaultMessage: 'Percentile {field}',
        values: { field: aggConfig.getFieldDisplayName() },
      });
    },
    getValueBucketPath(aggConfig) {
      return `${aggConfig.id}.${aggConfig.params.percentile}`;
    },
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.DATE, KBN_FIELD_TYPES.HISTOGRAM],
      },
      {
        name: 'percentile',
        default: 95,
        write: (agg, output) => {
          output.params.percents = [agg.params.percentile];
        },
      },
    ],
    getValue(agg, bucket) {
      let valueKey = String(agg.params.percentile);
      if (Number.isInteger(agg.params.percentile)) {
        valueKey += '.0';
      }
      const { values } = bucket[agg.id] ?? {};

      return values ? values[valueKey] : NaN;
    },
  });
};
