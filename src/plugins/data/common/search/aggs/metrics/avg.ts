/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggAvgFnName } from './avg_fn';
import { MetricAggType } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../..';
import { BaseAggParams } from '../types';

const averageTitle = i18n.translate('data.search.aggs.metrics.averageTitle', {
  defaultMessage: 'Average',
});

export interface AggParamsAvg extends BaseAggParams {
  field: string;
}

export const getAvgMetricAgg = () => {
  return new MetricAggType({
    name: METRIC_TYPES.AVG,
    expressionName: aggAvgFnName,
    title: averageTitle,
    valueType: 'number',
    makeLabel: (aggConfig) => {
      return i18n.translate('data.search.aggs.metrics.averageLabel', {
        defaultMessage: 'Average {field}',
        values: { field: aggConfig.getFieldDisplayName() },
      });
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
