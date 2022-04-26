/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, noop, find, every, omitBy, isNil } from 'lodash';
import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';

import { KBN_FIELD_TYPES, TimeRange, TimeRangeBounds, UI_SETTINGS } from '../../..';
import { IFieldType } from '../../..';

import { ExtendedBounds, extendedBoundsToAst, timerangeToAst } from '../../expressions';
import { intervalOptions, autoInterval, isAutoInterval } from './_interval_options';
import { createFilterDateHistogram } from './create_filter/date_histogram';
import { BucketAggType, IBucketAggConfig } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { aggDateHistogramFnName } from './date_histogram_fn';
import { TimeBuckets } from './lib/time_buckets';

import { writeParams } from '../agg_params';
import { isMetricAggType } from '../metrics/metric_agg_type';
import { BaseAggParams } from '../types';
import { dateHistogramInterval } from '../utils';
import { inferTimeZone } from '../utils';

/** @internal */
export type CalculateBoundsFn = (timeRange: TimeRange) => TimeRangeBounds;

const updateTimeBuckets = (
  agg: IBucketDateHistogramAggConfig,
  calculateBounds: CalculateBoundsFn,
  customBuckets?: IBucketDateHistogramAggConfig['buckets']
) => {
  const bounds =
    agg.params.timeRange && (agg.fieldIsTimeField() || isAutoInterval(agg.params.interval))
      ? calculateBounds(agg.params.timeRange)
      : undefined;
  const buckets = customBuckets || agg.buckets;
  buckets.setBounds(bounds);
  buckets.setInterval(agg.params.interval);
};

export interface DateHistogramBucketAggDependencies {
  calculateBounds: CalculateBoundsFn;
  isDefaultTimezone: () => boolean;
  getConfig: <T = any>(key: string) => T;
}

export interface IBucketDateHistogramAggConfig extends IBucketAggConfig {
  buckets: TimeBuckets;
}

export function isDateHistogramBucketAggConfig(agg: any): agg is IBucketDateHistogramAggConfig {
  return Boolean(agg.buckets);
}

export interface AggParamsDateHistogram extends BaseAggParams {
  field?: IFieldType | string;
  timeRange?: TimeRange;
  useNormalizedEsInterval?: boolean;
  scaleMetricValues?: boolean;
  interval?: string;
  used_interval?: string;
  time_zone?: string;
  used_time_zone?: string;
  drop_partials?: boolean;
  format?: string;
  min_doc_count?: number;
  extended_bounds?: ExtendedBounds;
  extendToTimeRange?: boolean;
}

export const getDateHistogramBucketAgg = ({
  calculateBounds,
  isDefaultTimezone,
  getConfig,
}: DateHistogramBucketAggDependencies) =>
  new BucketAggType<IBucketDateHistogramAggConfig>({
    name: BUCKET_TYPES.DATE_HISTOGRAM,
    expressionName: aggDateHistogramFnName,
    title: i18n.translate('data.search.aggs.buckets.dateHistogramTitle', {
      defaultMessage: 'Date Histogram',
    }),
    ordered: {
      date: true,
    },
    makeLabel(agg) {
      let output: Record<string, any> = {};

      if (this.params) {
        output = writeParams(this.params, agg);
      }

      const field = agg.getFieldDisplayName();

      return i18n.translate('data.search.aggs.buckets.dateHistogramLabel', {
        defaultMessage: '{fieldName} per {intervalDescription}',
        values: {
          fieldName: field,
          intervalDescription: output.metricScaleText || output.bucketInterval.description,
        },
      });
    },
    createFilter: createFilterDateHistogram,
    decorateAggConfig() {
      let buckets: any;

      return {
        buckets: {
          configurable: true,
          get() {
            if (buckets) return buckets;

            buckets = new TimeBuckets({
              'histogram:maxBars': getConfig(UI_SETTINGS.HISTOGRAM_MAX_BARS),
              'histogram:barTarget': getConfig(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
              dateFormat: getConfig('dateFormat'),
              'dateFormat:scaled': getConfig('dateFormat:scaled'),
            });
            updateTimeBuckets(this, calculateBounds, buckets);

            return buckets;
          },
        } as any,
      };
    },
    getSerializedFormat(agg) {
      return {
        id: 'date',
        params: {
          pattern: agg.buckets.getScaledDateFormat(),
        },
      };
    },
    getShiftedKey(agg, key, timeShift) {
      return moment(key).add(timeShift).valueOf();
    },
    splitForTimeShift(agg, aggs) {
      return aggs.hasTimeShifts() && Boolean(aggs.timeFields?.includes(agg.fieldName()));
    },
    getTimeShiftInterval(agg) {
      const { useNormalizedEsInterval } = agg.params;
      const interval = agg.buckets.getInterval(useNormalizedEsInterval);
      return interval;
    },
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: [KBN_FIELD_TYPES.DATE, KBN_FIELD_TYPES.DATE_RANGE],
        default(agg: IBucketDateHistogramAggConfig) {
          return agg.getIndexPattern().getTimeField?.()?.name;
        },
        onChange(agg: IBucketDateHistogramAggConfig) {
          if (isAutoInterval(get(agg, 'params.interval')) && !agg.fieldIsTimeField()) {
            delete agg.params.interval;
          }
        },
      },
      {
        name: 'timeRange',
        default: null,
        write: noop,
        toExpressionAst: timerangeToAst,
      },
      {
        name: 'useNormalizedEsInterval',
        default: true,
        write: noop,
      },
      {
        name: 'extendToTimeRange',
        default: false,
        write: noop,
      },
      {
        name: 'scaleMetricValues',
        default: false,
        write: noop,
        advanced: true,
      },
      {
        name: 'interval',
        deserialize(state: any, agg) {
          // For upgrading from 7.0.x to 7.1.x - intervals are now stored as key of options or custom value
          if (state === 'custom') {
            return get(agg, 'params.customInterval');
          }

          const interval = find(intervalOptions, { val: state });

          // For upgrading from 4.0.x to 4.1.x - intervals are now stored as 'y' instead of 'year',
          // but this maps the old values to the new values
          if (!interval && state === 'year') {
            return 'y';
          }
          return state;
        },
        default: autoInterval,
        options: intervalOptions,
        write(agg, output, aggs) {
          updateTimeBuckets(agg, calculateBounds);

          const { useNormalizedEsInterval, scaleMetricValues } = agg.params;
          const interval = agg.buckets.getInterval(useNormalizedEsInterval);
          output.bucketInterval = interval;
          if (interval.expression === '0ms') {
            // We are hitting this code a couple of times while configuring in editor
            // with an interval of 0ms because the overall time range has not yet been
            // set. Since 0ms is not a valid ES interval, we cannot pass it through dateHistogramInterval
            // below, since it would throw an exception. So in the cases we still have an interval of 0ms
            // here we simply skip the rest of the method and never write an interval into the DSL, since
            // this DSL will anyway not be used before we're passing this code with an actual interval.
            return;
          }
          output.params = {
            ...output.params,
            ...dateHistogramInterval(interval.expression),
          };

          const scaleMetrics =
            scaleMetricValues && interval.scaled && interval.scale && interval.scale < 1;
          if (scaleMetrics && aggs) {
            const metrics = aggs.aggs.filter((a) => isMetricAggType(a.type));
            const all = every(metrics, (a: IBucketAggConfig) => {
              const { type } = a;

              if (isMetricAggType(type)) {
                return type.isScalable();
              }
            });
            if (all) {
              output.metricScale = interval.scale;
              output.metricScaleText = interval.preScaled?.description || '';
            }
          }
        },
      },
      {
        name: 'used_interval',
        default: autoInterval,
        shouldShow() {
          return false;
        },
        write: () => {},
        serialize(val, agg) {
          if (!agg) return undefined;
          const { useNormalizedEsInterval } = agg.params;
          const interval = agg.buckets.getInterval(useNormalizedEsInterval);
          return interval.expression;
        },
        toExpressionAst: () => undefined,
      },
      {
        name: 'time_zone',
        default: undefined,
        // We don't ever want this parameter to be serialized out (when saving or to URLs)
        // since we do all the logic handling it "on the fly" in the `write` method, to prevent
        // time_zones being persisted into saved_objects
        serialize: noop,
        write(agg, output) {
          const tz = inferTimeZone(agg.params, agg.getIndexPattern(), isDefaultTimezone, getConfig);
          output.params.time_zone = tz;
        },
      },
      {
        name: 'used_timezone',
        shouldShow() {
          return false;
        },
        write: () => {},
        serialize(val, agg) {
          if (!agg) return undefined;
          return inferTimeZone(agg.params, agg.getIndexPattern(), isDefaultTimezone, getConfig);
        },
        toExpressionAst: () => undefined,
      },
      {
        name: 'drop_partials',
        default: false,
        write: noop,
        shouldShow: (agg) => {
          const field = agg.params.field;
          return field && field.name && field.name === agg.getIndexPattern().timeFieldName;
        },
      },
      {
        name: 'format',
      },
      {
        name: 'min_doc_count',
        default: 1,
      },
      {
        name: 'extended_bounds',
        default: {},
        write(agg, output) {
          const val = agg.params.extended_bounds;

          if (val.min != null || val.max != null) {
            output.params.extended_bounds = {
              min: moment(val.min).valueOf(),
              max: moment(val.max).valueOf(),
            };

            return;
          }

          if (agg.params.extendToTimeRange && agg.buckets.hasBounds()) {
            const bucketBounds = agg.buckets.getBounds()!;
            output.params.extended_bounds = omitBy(
              {
                min: bucketBounds.min?.valueOf(),
                max: bucketBounds.max?.valueOf(),
              },
              isNil
            );
          }
        },
        toExpressionAst: extendedBoundsToAst,
      },
    ],
  });
