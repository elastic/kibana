/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { MetricAggType } from './metric_agg_type';
import { aggSumFnName } from './sum_fn';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../../../common';
import { BaseAggParams } from '../types';

const sumTitle = i18n.translate('data.search.aggs.metrics.sumTitle', {
  defaultMessage: 'Sum',
});

export interface AggParamsSum extends BaseAggParams {
  field: string;
  emptyAsNull?: boolean;
}

export const getSumMetricAgg = () => {
  return new MetricAggType({
    name: METRIC_TYPES.SUM,
    expressionName: aggSumFnName,
    title: sumTitle,
    valueType: 'number',
    enableEmptyAsNull: true,
    makeLabel(aggConfig) {
      return i18n.translate('data.search.aggs.metrics.sumLabel', {
        defaultMessage: 'Sum of {field}',
        values: { field: aggConfig.getFieldDisplayName() },
      });
    },
    isScalable() {
      return true;
    },
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.HISTOGRAM],
      },
    ],
  });
};
