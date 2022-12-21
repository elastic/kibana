/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggGeoCentroidFnName } from './geo_centroid_fn';
import { MetricAggType } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../..';
import { BaseAggParams } from '../types';

export interface AggParamsGeoCentroid extends BaseAggParams {
  field: string;
}

const geoCentroidTitle = i18n.translate('data.search.aggs.metrics.geoCentroidTitle', {
  defaultMessage: 'Geo Centroid',
});

const geoCentroidLabel = i18n.translate('data.search.aggs.metrics.geoCentroidLabel', {
  defaultMessage: 'Geo Centroid',
});

export const getGeoCentroidMetricAgg = () => {
  return new MetricAggType({
    name: METRIC_TYPES.GEO_CENTROID,
    expressionName: aggGeoCentroidFnName,
    title: geoCentroidTitle,
    makeLabel: () => geoCentroidLabel,
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: KBN_FIELD_TYPES.GEO_POINT,
      },
    ],
    getValue(agg, bucket) {
      return bucket[agg.id] && bucket[agg.id].location;
    },
  });
};
