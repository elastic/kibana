/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import { inferTimeZone } from '../../..';
import { DateRange, dateRangeToAst } from '../../expressions';
import { BUCKET_TYPES } from './bucket_agg_types';
import { BucketAggType, IBucketAggConfig } from './bucket_agg_type';
import { createFilterDateRange } from './create_filter/date_range';
import { aggDateRangeFnName } from './date_range_fn';

import { KBN_FIELD_TYPES } from '../../../kbn_field_types/types';
import type { BaseAggParams } from '../types';
import type { AggTypesDependencies } from '../agg_types';

const dateRangeTitle = i18n.translate('data.search.aggs.buckets.dateRangeTitle', {
  defaultMessage: 'Date Range',
});

export interface AggParamsDateRange extends BaseAggParams {
  field?: string;
  ranges?: DateRange[];
  time_zone?: string;
}

export const getDateRangeBucketAgg = ({ aggExecutionContext, getConfig }: AggTypesDependencies) =>
  new BucketAggType({
    name: BUCKET_TYPES.DATE_RANGE,
    expressionName: aggDateRangeFnName,
    title: dateRangeTitle,
    createFilter: createFilterDateRange,
    getKey({ from, to }): DateRange {
      return { from, to };
    },
    getSerializedFormat(agg) {
      return {
        id: 'date_range',
        params: agg.params.field
          ? agg.aggConfigs.indexPattern.getFormatterForField(agg.params.field).toJSON()
          : {},
      };
    },
    makeLabel(aggConfig) {
      return aggConfig.getFieldDisplayName() + ' date ranges';
    },
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: [KBN_FIELD_TYPES.DATE, KBN_FIELD_TYPES.DATE_RANGE],
        default(agg: IBucketAggConfig) {
          return agg.getIndexPattern().getTimeField?.()?.name;
        },
      },
      {
        name: 'ranges',
        default: [
          {
            from: 'now-1w/w',
            to: 'now',
          },
        ],
        toExpressionAst: (ranges) => ranges?.map(dateRangeToAst),
      },
      {
        name: 'time_zone',
        default: undefined,
        // Implimentation method is the same as that of date_histogram
        serialize: () => undefined,
        write: (agg, output) => {
          const tz = inferTimeZone(
            agg.params,
            agg.getIndexPattern(),
            'date_range',
            getConfig,
            aggExecutionContext
          );
          output.params.time_zone = tz;
        },
      },
    ],
  });
