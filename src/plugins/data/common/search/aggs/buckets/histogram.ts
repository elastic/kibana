/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';

import { KBN_FIELD_TYPES, UI_SETTINGS } from '../../../../common';
import { AggTypesDependencies } from '../agg_types';
import { BaseAggParams } from '../types';

import { BucketAggType, IBucketAggConfig } from './bucket_agg_type';
import { createFilterHistogram } from './create_filter/histogram';
import { BUCKET_TYPES } from './bucket_agg_types';
import { aggHistogramFnName } from './histogram_fn';
import { ExtendedBounds } from './lib/extended_bounds';
import { isAutoInterval, autoInterval } from './_interval_options';
import { calculateHistogramInterval } from './lib/histogram_calculate_interval';

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
  interval: string;
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
        filterFieldTypes: KBN_FIELD_TYPES.NUMBER,
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
          const values = aggConfig.getAutoBounds();

          output.params.interval = calculateHistogramInterval({
            values,
            interval: aggConfig.params.interval,
            maxBucketsUiSettings: getConfig(UI_SETTINGS.HISTOGRAM_MAX_BARS),
            maxBucketsUserInput: aggConfig.params.maxBars,
            intervalBase: aggConfig.params.intervalBase,
            esTypes: aggConfig.params.field?.spec?.esTypes || [],
          });
        },
      },
      {
        name: 'maxBars',
        shouldShow(agg) {
          return isAutoInterval(get(agg, 'params.interval'));
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
      },
    ],
  });
