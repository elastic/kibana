/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggCardinalityFnName } from './cardinality_fn';
import { MetricAggType, IMetricAggConfig } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../..';
import { BaseAggParams } from '../types';

const uniqueCountTitle = i18n.translate('data.search.aggs.metrics.uniqueCountTitle', {
  defaultMessage: 'Unique Count',
});

export interface AggParamsCardinality extends BaseAggParams {
  field: string;
  emptyAsNull?: boolean;
}

export const getCardinalityMetricAgg = () =>
  new MetricAggType({
    name: METRIC_TYPES.CARDINALITY,
    valueType: 'number',
    expressionName: aggCardinalityFnName,
    title: uniqueCountTitle,
    enableEmptyAsNull: true,
    makeLabel(aggConfig: IMetricAggConfig) {
      return i18n.translate('data.search.aggs.metrics.uniqueCountLabel', {
        defaultMessage: 'Unique count of {field}',
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
        filterFieldTypes: Object.values(KBN_FIELD_TYPES).filter(
          (type) => type !== KBN_FIELD_TYPES.HISTOGRAM
        ),
      },
    ],
  });
