/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggValueCountFnName } from './value_count_fn';
import { MetricAggType, IMetricAggConfig } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';
import { BaseAggParams } from '../types';

const valueCountTitle = i18n.translate('data.search.aggs.metrics.valueCountTitle', {
  defaultMessage: 'Value Count',
});

export interface AggParamsValueCount extends BaseAggParams {
  field: string;
  emptyAsNull?: boolean;
}

export const getValueCountMetricAgg = () =>
  new MetricAggType({
    name: METRIC_TYPES.VALUE_COUNT,
    valueType: 'number',
    expressionName: aggValueCountFnName,
    title: valueCountTitle,
    enableEmptyAsNull: true,
    makeLabel(aggConfig: IMetricAggConfig) {
      return i18n.translate('data.search.aggs.metrics.valueCountLabel', {
        defaultMessage: 'Value count of {field}',
        values: { field: aggConfig.getFieldDisplayName() },
      });
    },
    getSerializedFormat(agg) {
      return {
        id: 'number',
      };
    },
    params: [
      {
        name: 'field',
        type: 'field',
      },
    ],
  });
