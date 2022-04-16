/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggMaxFnName } from './max_fn';
import { MetricAggType } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../..';
import { BaseAggParams } from '../types';

const maxTitle = i18n.translate('data.search.aggs.metrics.maxTitle', {
  defaultMessage: 'Max',
});

export interface AggParamsMax extends BaseAggParams {
  field: string;
}

export const getMaxMetricAgg = () => {
  return new MetricAggType({
    name: METRIC_TYPES.MAX,
    expressionName: aggMaxFnName,
    title: maxTitle,
    valueType: 'number',
    makeLabel(aggConfig) {
      return i18n.translate('data.search.aggs.metrics.maxLabel', {
        defaultMessage: 'Max {field}',
        values: { field: aggConfig.getFieldDisplayName() },
      });
    },
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.DATE, KBN_FIELD_TYPES.HISTOGRAM],
      },
    ],
  });
};
