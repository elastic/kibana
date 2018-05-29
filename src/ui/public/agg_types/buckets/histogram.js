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

import _ from 'lodash';

import '../../validate_date_interval';
import chrome from '../../chrome';
import { BucketAggType } from './_bucket_agg_type';
import { createFilterHistogram } from './create_filter/histogram';
import intervalTemplate from '../controls/number_interval.html';
import minDocCountTemplate from '../controls/min_doc_count.html';
import extendedBoundsTemplate from '../controls/extended_bounds.html';

const config = chrome.getUiSettingsClient();
export const histogramBucketAgg = new BucketAggType({
  name: 'histogram',
  title: 'Histogram',
  ordered: {},
  makeLabel: function (aggConfig) {
    return aggConfig.getFieldDisplayName();
  },
  createFilter: createFilterHistogram,
  decorateAggConfig: function () {
    let autoBounds;

    return {
      setAutoBounds: {
        configurable: true,
        value(newValue) {
          autoBounds = newValue;
        }
      },
      getAutoBounds: {
        configurable: true,
        value() {
          return autoBounds;
        }
      }
    };
  },
  params: [
    {
      name: 'field',
      filterFieldTypes: 'number'
    },

    {
      name: 'interval',
      editor: intervalTemplate,
      modifyAggConfigOnSearchRequestStart(aggConfig, searchSource) {
        const field = aggConfig.getField();
        const aggBody = field.scripted
          ? { script: { inline: field.script, lang: field.lang } }
          : { field: field.name };

        return searchSource
          .extend()
          .size(0)
          .aggs({
            maxAgg: {
              max: aggBody
            },
            minAgg: {
              min: aggBody
            }
          })
          .fetchAsRejectablePromise()
          .then((resp) => {
            aggConfig.setAutoBounds({
              min: _.get(resp, 'aggregations.minAgg.value'),
              max: _.get(resp, 'aggregations.maxAgg.value')
            });
          });
      },
      write: function (aggConfig, output) {
        let interval = parseFloat(aggConfig.params.interval);
        if (interval <= 0) {
          interval = 1;
        }

        // ensure interval does not create too many buckets and crash browser
        if (aggConfig.getAutoBounds()) {
          const range = aggConfig.getAutoBounds().max - aggConfig.getAutoBounds().min;
          const bars = range / interval;
          if (bars > config.get('histogram:maxBars')) {
            const minInterval = range / config.get('histogram:maxBars');
            // Round interval by order of magnitude to provide clean intervals
            // Always round interval up so there will always be less buckets than histogram:maxBars
            const orderOfMaginute = Math.pow(10, Math.floor(Math.log10(minInterval)));
            let roundInterval = orderOfMaginute;
            while (roundInterval < minInterval) {
              roundInterval += orderOfMaginute;
            }
            interval = roundInterval;
          }
        }

        output.params.interval = interval;
      }
    },

    {
      name: 'min_doc_count',
      default: null,
      editor: minDocCountTemplate,
      write: function (aggConfig, output) {
        if (aggConfig.params.min_doc_count) {
          output.params.min_doc_count = 0;
        } else {
          output.params.min_doc_count = 1;
        }
      }
    },

    {
      name: 'extended_bounds',
      default: {},
      editor: extendedBoundsTemplate,
      write: function (aggConfig, output) {
        const val = aggConfig.params.extended_bounds;

        if (aggConfig.params.min_doc_count && (val.min != null || val.max != null)) {
          output.params.extended_bounds = {
            min: val.min,
            max: val.max
          };
        }
      },

      // called from the editor
      shouldShow: function (aggConfig) {
        const field = aggConfig.params.field;
        if (
          field
          && (field.type === 'number' || field.type === 'date')
        ) {
          return aggConfig.params.min_doc_count;
        }
      }
    }
  ]
});
