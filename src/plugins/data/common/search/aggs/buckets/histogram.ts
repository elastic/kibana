/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import type { IUiSettingsClient } from '../../../../../../core/public/ui_settings/types';
import { KBN_FIELD_TYPES } from '../../../../common';
import { UI_SETTINGS } from '../../../constants';
import type { ExtendedBounds } from '../../expressions/extended_bounds';
import { extendedBoundsToAst } from '../../expressions/extended_bounds_to_ast';
import type { AggTypesDependencies } from '../agg_types';
import type { BaseAggParams } from '../types';
import type { IBucketAggConfig } from './bucket_agg_type';
import { BucketAggType } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { createFilterHistogram } from './create_filter/histogram';
import { aggHistogramFnName } from './histogram_fn';
import { calculateHistogramInterval } from './lib/histogram_calculate_interval';
import { autoInterval, isAutoInterval } from './_interval_options';

export interface AutoBounds {
  min: number;
  max: number;
}

export interface HistogramBucketAggDependencies {
  getConfig: <T = any>(key: string) => T;
  getFieldFormatsStart: AggTypesDependencies['getFieldFormatsStart'];
}

export interface IBucketHistogramAggConfig extends IBucketAggConfig {
  setAutoBounds: (bounds: AutoBounds) => void;
  getAutoBounds: () => AutoBounds;
}

export interface AggParamsHistogram extends BaseAggParams {
  field: string;
  interval: number | string;
  used_interval?: number | string;
  maxBars?: number;
  intervalBase?: number;
  min_doc_count?: boolean;
  has_extended_bounds?: boolean;
  extended_bounds?: ExtendedBounds;
}

export const getHistogramBucketAgg = ({
  getConfig,
  getFieldFormatsStart,
}: HistogramBucketAggDependencies) =>
  new BucketAggType<IBucketHistogramAggConfig>({
    name: BUCKET_TYPES.HISTOGRAM,
    expressionName: aggHistogramFnName,
    title: i18n.translate('data.search.aggs.buckets.histogramTitle', {
      defaultMessage: 'Histogram',
    }),
    ordered: {},
    makeLabel(aggConfig) {
      return aggConfig.getFieldDisplayName();
    },
    createFilter: createFilterHistogram(getFieldFormatsStart),
    decorateAggConfig() {
      let autoBounds: AutoBounds;

      return {
        setAutoBounds: {
          configurable: true,
          value(newValue: AutoBounds) {
            autoBounds = newValue;
          },
        },
        getAutoBounds: {
          configurable: true,
          value() {
            return autoBounds;
          },
        },
      };
    },
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.NUMBER_RANGE],
      },
      {
        /*
         * This parameter can be set if you want the auto scaled interval to always
         * be a multiple of a specific base.
         */
        name: 'intervalBase',
        default: null,
        write: () => {},
      },
      {
        name: 'interval',
        default: autoInterval,
        modifyAggConfigOnSearchRequestStart(
          aggConfig: IBucketHistogramAggConfig,
          searchSource: any,
          options: any
        ) {
          const field = aggConfig.getField();
          if (field?.type === 'number_range') {
            // Can't scale number_histogram requests
            return;
          }

          const aggBody = field.scripted
            ? { script: { source: field.script, lang: field.lang } }
            : { field: field.name };

          const childSearchSource = searchSource
            .createChild()
            .setField('size', 0)
            .setField('aggs', {
              maxAgg: {
                max: aggBody,
              },
              minAgg: {
                min: aggBody,
              },
            });

          return childSearchSource
            .fetch(options)
            .then((resp: any) => {
              const min = resp.aggregations?.minAgg?.value ?? 0;
              const max = resp.aggregations?.maxAgg?.value ?? 0;

              aggConfig.setAutoBounds({
                min,
                max,
              });
            })
            .catch((e: Error) => {
              if (e.name === 'AbortError') return;
              throw new Error(
                i18n.translate('data.search.aggs.histogram.missingMaxMinValuesWarning', {
                  defaultMessage:
                    'Unable to retrieve max and min values to auto-scale histogram buckets. This may lead to poor visualization performance.',
                })
              );
            });
        },
        write(aggConfig, output) {
          output.params.interval = calculateInterval(aggConfig, getConfig);
        },
      },
      {
        name: 'used_interval',
        default: autoInterval,
        shouldShow() {
          return false;
        },
        write: () => {},
        serialize(val, aggConfig) {
          if (!aggConfig) return undefined;
          // store actually used auto interval in serialized agg config to be able to read it from the result data table meta information
          return calculateInterval(aggConfig, getConfig);
        },
        toExpressionAst: () => undefined,
      },
      {
        name: 'maxBars',
        shouldShow(agg) {
          const field = agg.getField();
          // Show this for empty field and number field, but not range
          return field?.type !== 'number_range' && isAutoInterval(get(agg, 'params.interval'));
        },
        write: () => {},
      },
      {
        name: 'min_doc_count',
        default: false,
        write(aggConfig, output) {
          if (aggConfig.params.min_doc_count) {
            output.params.min_doc_count = 0;
          } else {
            output.params.min_doc_count = 1;
          }
        },
      },
      {
        name: 'has_extended_bounds',
        default: false,
        write: () => {},
      },
      {
        name: 'extended_bounds',
        default: {
          min: '',
          max: '',
        },
        write(aggConfig, output) {
          const { min, max } = aggConfig.params.extended_bounds;

          if (aggConfig.params.has_extended_bounds && (min || min === 0) && (max || max === 0)) {
            output.params.extended_bounds = { min, max };
          }
        },
        shouldShow: (aggConfig: IBucketAggConfig) => aggConfig.params.has_extended_bounds,
        toExpressionAst: extendedBoundsToAst,
      },
    ],
  });

function calculateInterval(
  aggConfig: IBucketHistogramAggConfig,
  getConfig: IUiSettingsClient['get']
): any {
  const values = aggConfig.getAutoBounds();
  return calculateHistogramInterval({
    values,
    interval: aggConfig.params.interval,
    maxBucketsUiSettings: getConfig(UI_SETTINGS.HISTOGRAM_MAX_BARS),
    maxBucketsUserInput: aggConfig.params.maxBars,
    intervalBase: aggConfig.params.intervalBase,
    esTypes: aggConfig.params.field?.spec?.esTypes || [],
  });
}
