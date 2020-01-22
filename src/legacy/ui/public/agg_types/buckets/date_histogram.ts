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
import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';

import { npStart } from 'ui/new_platform';
import { BucketAggType, IBucketAggConfig } from './_bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { createFilterDateHistogram } from './create_filter/date_histogram';
import { intervalOptions } from './_interval_options';
import { TimeIntervalParamEditor } from '../../vis/editors/default/controls/time_interval';
import { timefilter } from '../../timefilter';
import { DropPartialsParamEditor } from '../../vis/editors/default/controls/drop_partials';
import { ScaleMetricsParamEditor } from '../../vis/editors/default/controls/scale_metrics';
import { dateHistogramInterval } from '../../../../core_plugins/data/public';
import { writeParams } from '../agg_params';
import { isMetricAggType } from '../metrics/metric_agg_type';

import { KBN_FIELD_TYPES } from '../../../../../plugins/data/public';

// @ts-ignore
import { TimeBuckets } from '../../time_buckets';

const detectedTimezone = moment.tz.guess();
const tzOffset = moment().format('Z');

const getInterval = (agg: IBucketAggConfig): string => _.get(agg, ['params', 'interval']);

export const setBounds = (agg: IBucketDateHistogramAggConfig, force?: boolean) => {
  if (agg.buckets._alreadySet && !force) return;
  agg.buckets._alreadySet = true;
  const bounds = agg.params.timeRange ? timefilter.calculateBounds(agg.params.timeRange) : null;
  agg.buckets.setBounds(agg.fieldIsTimeField() && bounds);
};

// will be replaced by src/legacy/ui/public/time_buckets/time_buckets.js
interface TimeBuckets {
  _alreadySet?: boolean;
  setBounds: Function;
  getScaledDateFormatter: Function;
  setInterval: Function;
  getInterval: Function;
}

export interface IBucketDateHistogramAggConfig extends IBucketAggConfig {
  buckets: TimeBuckets;
}

export function isDateHistogramBucketAggConfig(agg: any): agg is IBucketDateHistogramAggConfig {
  return Boolean(agg.buckets);
}

export const dateHistogramBucketAgg = new BucketAggType<IBucketDateHistogramAggConfig>({
  name: BUCKET_TYPES.DATE_HISTOGRAM,
  title: i18n.translate('common.ui.aggTypes.buckets.dateHistogramTitle', {
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
    return i18n.translate('common.ui.aggTypes.buckets.dateHistogramLabel', {
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

          buckets = new TimeBuckets();
          buckets.setInterval(getInterval(this));
          setBounds(this);

          return buckets;
        },
      } as any,
    };
  },
  getFormat(agg) {
    return agg.buckets.getScaledDateFormatter();
  },
  params: [
    {
      name: 'field',
      type: 'field',
      filterFieldTypes: KBN_FIELD_TYPES.DATE,
      default(agg: IBucketDateHistogramAggConfig) {
        return agg.getIndexPattern().timeFieldName;
      },
      onChange(agg: IBucketDateHistogramAggConfig) {
        if (_.get(agg, 'params.interval') === 'auto' && !agg.fieldIsTimeField()) {
          delete agg.params.interval;
        }

        setBounds(agg, true);
      },
    },
    {
      name: 'timeRange',
      default: null,
      write: _.noop,
    },
    {
      name: 'useNormalizedEsInterval',
      default: true,
      write: _.noop,
    },
    {
      name: 'scaleMetricValues',
      default: false,
      write: _.noop,
      advanced: true,
      editorComponent: ScaleMetricsParamEditor,
    },
    {
      name: 'interval',
      editorComponent: TimeIntervalParamEditor,
      deserialize(state: any, agg) {
        // For upgrading from 7.0.x to 7.1.x - intervals are now stored as key of options or custom value
        if (state === 'custom') {
          return _.get(agg, 'params.customInterval');
        }

        const interval = _.find(intervalOptions, { val: state });

        // For upgrading from 4.0.x to 4.1.x - intervals are now stored as 'y' instead of 'year',
        // but this maps the old values to the new values
        if (!interval && state === 'year') {
          return 'y';
        }
        return state;
      },
      default: 'auto',
      options: intervalOptions,
      modifyAggConfigOnSearchRequestStart(agg: IBucketDateHistogramAggConfig) {
        setBounds(agg, true);
      },
      write(agg, output, aggs) {
        setBounds(agg, true);
        agg.buckets.setInterval(getInterval(agg));
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

        const scaleMetrics = scaleMetricValues && interval.scaled && interval.scale < 1;
        if (scaleMetrics && aggs) {
          const metrics = aggs.aggs.filter(a => isMetricAggType(a.type));
          const all = _.every(metrics, (a: IBucketAggConfig) => {
            const { type } = a;

            if (isMetricAggType(type)) {
              return type.isScalable();
            }
          });
          if (all) {
            output.metricScale = interval.scale;
            output.metricScaleText = interval.preScaled.description;
          }
        }
      },
    },
    {
      name: 'time_zone',
      default: undefined,
      // We don't ever want this parameter to be serialized out (when saving or to URLs)
      // since we do all the logic handling it "on the fly" in the `write` method, to prevent
      // time_zones being persisted into saved_objects
      serialize: _.noop,
      write(agg, output) {
        // If a time_zone has been set explicitly always prefer this.
        let tz = agg.params.time_zone;
        if (!tz && agg.params.field) {
          // If a field has been configured check the index pattern's typeMeta if a date_histogram on that
          // field requires a specific time_zone
          tz = _.get(agg.getIndexPattern(), [
            'typeMeta',
            'aggs',
            'date_histogram',
            agg.params.field.name,
            'time_zone',
          ]);
        }
        if (!tz) {
          const config = npStart.core.uiSettings;
          // If the index pattern typeMeta data, didn't had a time zone assigned for the selected field use the configured tz
          const isDefaultTimezone = config.isDefault('dateFormat:tz');
          tz = isDefaultTimezone ? detectedTimezone || tzOffset : config.get('dateFormat:tz');
        }
        output.params.time_zone = tz;
      },
    },
    {
      name: 'drop_partials',
      default: false,
      write: _.noop,
      editorComponent: DropPartialsParamEditor,
      shouldShow: agg => {
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
      },
    },
  ],
});
