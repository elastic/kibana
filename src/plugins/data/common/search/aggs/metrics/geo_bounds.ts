/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggGeoBoundsFnName } from './geo_bounds_fn';
import { MetricAggType } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../..';
import { BaseAggParams } from '../types';

export interface AggParamsGeoBounds extends BaseAggParams {
  field: string;
}

const geoBoundsTitle = i18n.translate('data.search.aggs.metrics.geoBoundsTitle', {
  defaultMessage: 'Geo Bounds',
});

const geoBoundsLabel = i18n.translate('data.search.aggs.metrics.geoBoundsLabel', {
  defaultMessage: 'Geo Bounds',
});

export const getGeoBoundsMetricAgg = () => {
  return new MetricAggType({
    name: METRIC_TYPES.GEO_BOUNDS,
    expressionName: aggGeoBoundsFnName,
    title: geoBoundsTitle,
    makeLabel: () => geoBoundsLabel,
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: KBN_FIELD_TYPES.GEO_POINT,
      },
    ],
  });
};
