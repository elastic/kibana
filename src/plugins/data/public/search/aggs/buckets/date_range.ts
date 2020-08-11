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
import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from 'src/core/public';

import { BUCKET_TYPES } from './bucket_agg_types';
import { BucketAggType, IBucketAggConfig } from './bucket_agg_type';
import { createFilterDateRange } from './create_filter/date_range';
import { DateRangeKey } from './lib/date_range';

import { KBN_FIELD_TYPES } from '../../../../common';
import { BaseAggParams } from '../types';

const dateRangeTitle = i18n.translate('data.search.aggs.buckets.dateRangeTitle', {
  defaultMessage: 'Date Range',
});

export interface DateRangeBucketAggDependencies {
  uiSettings: IUiSettingsClient;
}

export interface AggParamsDateRange extends BaseAggParams {
  field?: string;
  ranges?: DateRangeKey[];
  time_zone?: string;
}

export const getDateRangeBucketAgg = ({ uiSettings }: DateRangeBucketAggDependencies) =>
  new BucketAggType({
    name: BUCKET_TYPES.DATE_RANGE,
    title: dateRangeTitle,
    createFilter: createFilterDateRange,
    getKey({ from, to }): DateRangeKey {
      return { from, to };
    },
    getSerializedFormat(agg) {
      return {
        id: 'date_range',
        params: agg.params.field ? agg.params.field.format.toJSON() : {},
      };
    },
    makeLabel(aggConfig) {
      return aggConfig.getFieldDisplayName() + ' date ranges';
    },
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: KBN_FIELD_TYPES.DATE,
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
            const isDefaultTimezone = uiSettings.isDefault('dateFormat:tz');

            tz = isDefaultTimezone ? detectedTimezone || tzOffset : uiSettings.get('dateFormat:tz');
          }
          output.params.time_zone = tz;
        },
      },
    ],
  });
