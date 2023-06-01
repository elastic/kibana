/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggRateFnName } from './rate_fn';
import { MetricAggType } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../..';
import { BaseAggParams } from '../types';

const rateTitle = i18n.translate('data.search.aggs.metrics.rateTitle', {
  defaultMessage: 'Rate',
});

export interface AggParamsRate extends BaseAggParams {
  unit: string;
  field?: string;
}

export const getRateMetricAgg = () => {
  return new MetricAggType({
    name: METRIC_TYPES.RATE,
    expressionName: aggRateFnName,
    title: rateTitle,
    valueType: 'number',
    makeLabel: (aggConfig) => {
      return i18n.translate('data.search.aggs.metrics.rateLabel', {
        defaultMessage: 'Rate of {field} per {unit}',
        values: { field: aggConfig.getFieldDisplayName(), unit: aggConfig.getParam('unit') },
      });
    },
    params: [
      {
        name: 'field',
        type: 'field',
        required: false,
        filterFieldTypes: [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.HISTOGRAM],
      },
      {
        name: 'unit',
        type: 'string',
        displayName: i18n.translate('data.search.aggs.metrics.rate.unit.displayName', {
          defaultMessage: 'Unit',
        }),
        required: true,
        options: [
          {
            text: i18n.translate('data.search.aggs.metrics.rate.unit.second', {
              defaultMessage: 'Second',
            }),
            value: 'second',
          },
          {
            text: i18n.translate('data.search.aggs.metrics.rate.unit.minute', {
              defaultMessage: 'Minute',
            }),
            value: 'minute',
          },
          {
            text: i18n.translate('data.search.aggs.metrics.rate.unit.hour', {
              defaultMessage: 'Hour',
            }),
            value: 'hour',
          },
          {
            text: i18n.translate('data.search.aggs.metrics.rate.unit.day', {
              defaultMessage: 'Day',
            }),
            value: 'day',
          },
          {
            text: i18n.translate('data.search.aggs.metrics.rate.unit.week', {
              defaultMessage: 'Week',
            }),
            value: 'week',
          },
          {
            text: i18n.translate('data.search.aggs.metrics.rate.unit.month', {
              defaultMessage: 'Month',
            }),
            value: 'month',
          },
          {
            text: i18n.translate('data.search.aggs.metrics.rate.unit.quarter', {
              defaultMessage: 'Quarter',
            }),
            value: 'quarter',
          },
          {
            text: i18n.translate('data.search.aggs.metrics.rate.unit.year', {
              defaultMessage: 'Year',
            }),
            value: 'year',
          },
        ],
      },
    ],
  });
};
