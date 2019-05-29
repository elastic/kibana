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

import { toastNotifications } from 'ui/notify';
import chrome from '../../chrome';
import { BucketAggType } from './_bucket_agg_type';
import { createFilterHistogram } from './create_filter/histogram';
import { NumberIntervalParamEditor } from '../controls/number_interval';
import { MinDocCountParamEditor } from '../controls/min_doc_count';
import { HasExtendedBoundsParamEditor } from '../controls/has_extended_bounds';
import { ExtendedBoundsParamEditor } from '../controls/extended_bounds';
import { i18n } from '@kbn/i18n';

const config = chrome.getUiSettingsClient();
export const histogramBucketAgg = new BucketAggType({
  name: 'histogram',
  title: i18n.translate('common.ui.aggTypes.buckets.histogramTitle', {
    defaultMessage: 'Histogram',
  }),
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
      type: 'field',
      filterFieldTypes: 'number'
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
      editorComponent: NumberIntervalParamEditor,
      modifyAggConfigOnSearchRequestStart(aggConfig, searchSource) {
        const field = aggConfig.getField();
        const aggBody = field.scripted
          ? { script: { source: field.script, lang: field.lang } }
          : { field: field.name };

        return searchSource
          .createChild()
          .setField('size', 0)
          .setField('aggs', {
            maxAgg: {
              max: aggBody
            },
            minAgg: {
              min: aggBody
            }
          })
          .fetch()
          .then((resp) => {
            aggConfig.setAutoBounds({
              min: _.get(resp, 'aggregations.minAgg.value'),
              max: _.get(resp, 'aggregations.maxAgg.value')
            });
          })
          .catch(() => {
            toastNotifications.addWarning(i18n.translate('common.ui.aggTypes.histogram.missingMaxMinValuesWarning', {
              // eslint-disable-next-line max-len
              defaultMessage: 'Unable to retrieve max and min values to auto-scale histogram buckets. This may lead to poor visualization performance.'
            }));
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
            const orderOfMagnitude = Math.pow(10, Math.floor(Math.log10(minInterval)));
            let roundInterval = orderOfMagnitude;
            while (roundInterval < minInterval) {
              roundInterval += orderOfMagnitude;
            }
            interval = roundInterval;
          }
        }

        const base = aggConfig.params.intervalBase;
        if (base) {
          if (interval < base) {
            // In case the specified interval is below the base, just increase it to it's base
            interval = base;
          } else if (interval % base !== 0) {
            // In case the interval is not a multiple of the base round it to the next base
            interval = Math.round(interval / base) * base;
          }
        }

        output.params.interval = interval;
      }
    },

    {
      name: 'min_doc_count',
      default: false,
      editorComponent: MinDocCountParamEditor,
      write: function (aggConfig, output) {
        if (aggConfig.params.min_doc_count) {
          output.params.min_doc_count = 0;
        } else {
          output.params.min_doc_count = 1;
        }
      }
    },

    {
      name: 'has_extended_bounds',
      default: false,
      editorComponent: HasExtendedBoundsParamEditor,
      write: () => {},
    },

    {
      name: 'extended_bounds',
      default: {
        min: '',
        max: '',
      },
      editorComponent: ExtendedBoundsParamEditor,
      write: function (aggConfig, output) {
        const { min, max } = aggConfig.params.extended_bounds;

        if (aggConfig.params.has_extended_bounds &&
          (min || min === 0) &&
          (max || max === 0)) {
          output.params.extended_bounds = { min, max };
        }
      },
      shouldShow: aggConfig => aggConfig.params.has_extended_bounds
    }
  ]
});
