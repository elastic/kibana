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

import { jstz as tzDetect } from 'jstimezonedetect';
import _ from 'lodash';
import chrome from '../../chrome';
import moment from 'moment';
import '../../filters/field_type';
import '../../validate_date_interval';
import { BucketAggType } from './_bucket_agg_type';
import { TimeBuckets } from '../../time_buckets';
import { createFilterDateHistogram } from './create_filter/date_histogram';
import { intervalOptions } from './_interval_options';
import intervalTemplate from '../controls/time_interval.html';

const config = chrome.getUiSettingsClient();
const detectedTimezone = tzDetect.determine().name();
const tzOffset = moment().format('Z');

function getInterval(agg) {
  const interval = _.get(agg, ['params', 'interval']);
  if (interval && interval.val === 'custom') {
    return _.get(agg, ['params', 'customInterval']);
  }
  return interval;
}

function getBounds(vis) {
  if (vis.API.timeFilter.isTimeRangeSelectorEnabled && vis.filters) {
    return vis.API.timeFilter.calculateBounds(vis.filters.timeRange);
  }
}

function setBounds(agg, force) {
  if (agg.buckets._alreadySet && !force) return;
  agg.buckets._alreadySet = true;
  const bounds = getBounds(agg.vis);
  agg.buckets.setBounds(agg.fieldIsTimeField() && bounds);
}


export const dateHistogramBucketAgg = new BucketAggType({
  name: 'date_histogram',
  title: 'Date Histogram',
  ordered: {
    date: true
  },
  makeLabel: function (agg) {
    const output = this.params.write(agg);
    const field = agg.getFieldDisplayName();
    return field + ' per ' + (output.metricScaleText || output.bucketInterval.description);
  },
  createFilter: createFilterDateHistogram,
  decorateAggConfig: function () {
    let buckets;
    return {
      buckets: {
        configurable: true,
        get: function () {
          if (buckets) return buckets;

          buckets = new TimeBuckets();
          buckets.setInterval(getInterval(this));
          setBounds(this);

          return buckets;
        }
      }
    };
  },
  getFormat: function (agg) {
    return agg.buckets.getScaledDateFormatter();
  },
  params: [
    {
      name: 'field',
      filterFieldTypes: 'date',
      default: function (agg) {
        return agg.vis.indexPattern.timeFieldName;
      },
      onChange: function (agg) {
        if (_.get(agg, 'params.interval.val') === 'auto' && !agg.fieldIsTimeField()) {
          delete agg.params.interval;
        }

        setBounds(agg, true);
      }
    },

    {
      name: 'interval',
      type: 'optioned',
      deserialize: function (state) {
        const interval = _.find(intervalOptions, { val: state });
        return interval || _.find(intervalOptions, function (option) {
          // For upgrading from 4.0.x to 4.1.x - intervals are now stored as 'y' instead of 'year',
          // but this maps the old values to the new values
          return Number(moment.duration(1, state)) === Number(moment.duration(1, option.val));
        });
      },
      default: 'auto',
      options: intervalOptions,
      editor: intervalTemplate,
      modifyAggConfigOnSearchRequestStart: function (agg) {
        setBounds(agg, true);
      },
      write: function (agg, output) {
        setBounds(agg);
        agg.buckets.setInterval(getInterval(agg));

        const interval = agg.buckets.getInterval();
        output.bucketInterval = interval;
        output.params.interval = interval.expression;

        const isDefaultTimezone = config.isDefault('dateFormat:tz');
        if (isDefaultTimezone) {
          output.params.time_zone = detectedTimezone || tzOffset;
        } else {
          output.params.time_zone = config.get('dateFormat:tz');
        }

        const scaleMetrics = interval.scaled && interval.scale < 1;
        if (scaleMetrics) {
          const all = _.every(agg.vis.getAggConfig().bySchemaGroup.metrics, function (agg) {
            return agg.type && agg.type.isScalable();
          });
          if (all) {
            output.metricScale = interval.scale;
            output.metricScaleText = interval.preScaled.description;
          }
        }
      }
    },

    {
      name: 'customInterval',
      default: '2h',
      write: _.noop
    },

    {
      name: 'format'
    },

    {
      name: 'min_doc_count',
      default: 1
    },

    {
      name: 'extended_bounds',
      default: {},
      write: function (agg, output) {
        const val = agg.params.extended_bounds;

        if (val.min != null || val.max != null) {
          output.params.extended_bounds = {
            min: moment(val.min).valueOf(),
            max: moment(val.max).valueOf()
          };

          return;
        }
      }
    }
  ]
});
