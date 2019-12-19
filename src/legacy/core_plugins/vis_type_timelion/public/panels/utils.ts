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

import { cloneDeep, defaults, merge } from 'lodash';
import moment from 'moment-timezone';

// @ts-ignore
import { calculateInterval, DEFAULT_TIME_FORMAT } from '../../common/lib';
import { tickFormatters } from '../services/tick_formatters';
import { xaxisFormatterProvider } from './timechart/xaxis_formatter';
import { generateTicksProvider } from './timechart/tick_generator';
import { Series } from './panel';

function buildSeriesData(chart: Series[], options: object) {
  return chart.map((series: Series, seriesIndex: number) => {
    const newSeries: Series = cloneDeep(
      defaults(series, {
        shadowSize: 0,
        lines: {
          lineWidth: 3,
        },
      })
    );

    newSeries._id = seriesIndex;

    if (series.color) {
      const span = document.createElement('span');
      span.style.color = series.color;
      newSeries.color = span.style.color;
    }

    if (series._hide) {
      newSeries.data = [];
      newSeries.stack = false;
      newSeries.label = `(hidden) ${series.label}`;
    }

    if (series._global) {
      merge(options, series._global, (objVal, srcVal) => {
        // This is kind of gross, it means that you can't replace a global value with a null
        // best you can do is an empty string. Deal with it.
        if (objVal == null) return srcVal;
        if (srcVal == null) return objVal;
      });
    }

    return newSeries;
  });
}

function buildOptions(defaultOptions: any, timefilter: any, intervalValue: string, uiSettings: any, clientWidth = 0) {
  const options = cloneDeep(defaultOptions);
  // Get the X-axis tick format
  const time = timefilter.getBounds() as any;
  const interval = calculateInterval(
    time.min.valueOf(),
    time.max.valueOf(),
    uiSettings.get('timelion:target_buckets') || 200,
    intervalValue,
    uiSettings.get('timelion:min_interval') || '1ms'
  );
  const format = xaxisFormatterProvider(uiSettings)(interval);

  // Use moment to format ticks so we get timezone correction
  options.xaxis.tickFormatter = (val: any) => moment(val).format(format);

  // Calculate how many ticks can fit on the axis
  const tickLetterWidth = 7;
  const tickPadding = 45;
  options.xaxis.ticks = Math.floor(
    clientWidth / (format.length * tickLetterWidth + tickPadding)
  );

  if (options.yaxes) {
    options.yaxes.forEach((yaxis: any) => {
      if (yaxis && yaxis.units) {
        const formatters = tickFormatters() as any;
        yaxis.tickFormatter = formatters[yaxis.units.type];
        const byteModes = ['bytes', 'bytes/s'];
        if (byteModes.includes(yaxis.units.type)) {
          yaxis.tickGenerator = generateTicksProvider();
        }
      }
    });
  }

  return options;
}

export { buildSeriesData, buildOptions};
