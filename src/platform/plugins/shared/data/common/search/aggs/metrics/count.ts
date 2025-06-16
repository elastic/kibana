/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { BaseAggParams } from '../types';
import { aggCountFnName } from './count_fn';
import { MetricAggType } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';

export interface AggParamsCount extends BaseAggParams {
  emptyAsNull?: boolean;
}

export const getCountMetricAgg = () =>
  new MetricAggType({
    name: METRIC_TYPES.COUNT,
    expressionName: aggCountFnName,
    title: i18n.translate('data.search.aggs.metrics.countTitle', {
      defaultMessage: 'Count',
    }),
    hasNoDsl: true,
    json: false,
    enableEmptyAsNull: true,
    makeLabel() {
      return i18n.translate('data.search.aggs.metrics.countLabel', {
        defaultMessage: 'Count',
      });
    },
    getSerializedFormat(agg) {
      return {
        id: 'number',
      };
    },
    getValue(agg, bucket) {
      const timeShift = agg.getTimeShift();
      let value: unknown;
      if (!timeShift) {
        value = bucket.doc_count;
      } else {
        value = bucket[`doc_count_${timeShift.asMilliseconds()}`];
      }
      if (value === 0 && agg.params.emptyAsNull) {
        return null;
      }
      if (value == null) {
        // if the value is undefined, respect the emptyAsNull flag
        return agg.params.emptyAsNull ? null : 0;
      }
      return value;
    },
    isScalable() {
      return true;
    },
  });
