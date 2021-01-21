/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggCountFnName } from './count_fn';
import { MetricAggType } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';

export const getCountMetricAgg = () =>
  new MetricAggType({
    name: METRIC_TYPES.COUNT,
    expressionName: aggCountFnName,
    title: i18n.translate('data.search.aggs.metrics.countTitle', {
      defaultMessage: 'Count',
    }),
    hasNoDsl: true,
    json: false,
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
      return bucket.doc_count;
    },
    isScalable() {
      return true;
    },
  });
