/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';

import { DateRange, dateRangeToAst } from '../../expressions';
import { BUCKET_TYPES } from './bucket_agg_types';
import { BucketAggType, IBucketAggConfig } from './bucket_agg_type';
import { createFilterDateRange } from './create_filter/date_range';
import { aggDateRangeFnName } from './date_range_fn';

import { KBN_FIELD_TYPES } from '../../../kbn_field_types/types';
import { BaseAggParams } from '../types';

const dateRangeTitle = i18n.translate('data.search.aggs.buckets.dateRangeTitle', {
  defaultMessage: 'Date Range',
});

export interface DateRangeBucketAggDependencies {
  isDefaultTimezone: () => boolean;
  getConfig: <T = any>(key: string) => T;
}

export interface AggParamsDateRange extends BaseAggParams {
  field?: string;
  ranges?: DateRange[];
  time_zone?: string;
}

export const getDateRangeBucketAgg = ({
  isDefaultTimezone,
  getConfig,
}: DateRangeBucketAggDependencies) =>
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
          return agg.getIndexPattern().timeFieldName;
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
          const field = agg.getParam('field');
          let tz = agg.getParam('time_zone');

          if (!tz && field) {
            tz = get(agg.getIndexPattern(), [
              'typeMeta',
              'aggs',
              'date_range',
              field.name,
              'time_zone',
            ]);
          }
          if (!tz) {
            const detectedTimezone = moment.tz.guess();
            const tzOffset = moment().format('Z');

            tz = isDefaultTimezone() ? detectedTimezone || tzOffset : getConfig('dateFormat:tz');
          }
          output.params.time_zone = tz;
        },
      },
    ],
  });
