/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggMedianFnName } from './median_fn';
import { MetricAggType } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../../../common';
import { BaseAggParams } from '../types';

const medianTitle = i18n.translate('data.search.aggs.metrics.medianTitle', {
  defaultMessage: 'Median',
});

export interface AggParamsMedian extends BaseAggParams {
  field: string;
}

export const getMedianMetricAgg = () => {
  return new MetricAggType({
    name: METRIC_TYPES.MEDIAN,
    expressionName: aggMedianFnName,
    dslName: 'percentiles',
    title: medianTitle,
    makeLabel(aggConfig) {
      return i18n.translate('data.search.aggs.metrics.medianLabel', {
        defaultMessage: 'Median {field}',
        values: { field: aggConfig.getFieldDisplayName() },
      });
    },
    getValueBucketPath(aggConfig) {
      return `${aggConfig.id}.50`;
    },
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.DATE, KBN_FIELD_TYPES.HISTOGRAM],
        write(agg, output) {
          output.params.field = agg.getParam('field').name;
          output.params.percents = [50];
        },
      },
    ],
    getValue(agg, bucket) {
      return bucket[agg.id].values['50.0'];
    },
  });
};
