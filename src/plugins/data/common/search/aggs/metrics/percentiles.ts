/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { MetricAggType } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../../../common';
import { getResponseAggConfigClass } from './lib/get_response_agg_config_class';
import type { IResponseAggConfig } from './lib/get_response_agg_config_class';
import { aggPercentilesFnName } from './percentiles_fn';
import { getPercentileValue } from './percentiles_get_value';
import { ordinalSuffix } from './lib/ordinal_suffix';
import { BaseAggParams } from '../types';

export interface AggParamsPercentiles extends BaseAggParams {
  field: string;
  percents?: number[];
}

export type IPercentileAggConfig = IResponseAggConfig;

const valueProps = {
  makeLabel(this: IPercentileAggConfig) {
    const customLabel = this.getParam('customLabel');
    const label = customLabel || this.getFieldDisplayName();

    return i18n.translate('data.search.aggs.metrics.percentiles.valuePropsLabel', {
      defaultMessage: '{percentile} percentile of {label}',
      values: { percentile: ordinalSuffix(this.key), label },
    });
  },
};

export const getPercentilesMetricAgg = () => {
  return new MetricAggType<IPercentileAggConfig>({
    name: METRIC_TYPES.PERCENTILES,
    expressionName: aggPercentilesFnName,
    title: i18n.translate('data.search.aggs.metrics.percentilesTitle', {
      defaultMessage: 'Percentiles',
    }),
    valueType: 'number',
    makeLabel(agg) {
      return i18n.translate('data.search.aggs.metrics.percentilesLabel', {
        defaultMessage: 'Percentiles of {field}',
        values: { field: agg.getFieldDisplayName() },
      });
    },
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.DATE, KBN_FIELD_TYPES.HISTOGRAM],
      },
      {
        name: 'percents',
        default: [1, 5, 25, 50, 75, 95, 99],
      },
      {
        write(agg, output) {
          output.params.keyed = false;
        },
      },
    ],
    getResponseAggs(agg) {
      const ValueAggConfig = getResponseAggConfigClass(agg, valueProps);

      return agg.getParam('percents').map((percent: any) => new ValueAggConfig(percent));
    },

    getValue: getPercentileValue,
  });
};
