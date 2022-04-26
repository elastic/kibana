/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { MetricAggType } from './metric_agg_type';
import { aggRateFnName } from './rate_fn';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../..';
import { BaseAggParams } from '../types';

const rateTitle = i18n.translate('data.search.aggs.metrics.rateTitle', {
  defaultMessage: 'Rate',
});

export interface AggParamsRate extends BaseAggParams {
  field: string;
  emptyAsNull?: boolean;
}

export const getRateMetricAgg = () => {
  return new MetricAggType({
    name: METRIC_TYPES.RATE,
    expressionName: aggRateFnName,
    title: rateTitle,
    valueType: 'number',
    enableEmptyAsNull: true,
    makeLabel(aggConfig) {
      return i18n.translate('data.search.aggs.metrics.rateLabel', {
        defaultMessage: 'Rate of {field}',
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
