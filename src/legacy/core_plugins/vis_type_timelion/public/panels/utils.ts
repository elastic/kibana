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

import { debounce, compact, get, each, noop, cloneDeep, defaults, merge } from 'lodash';

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

export { buildSeriesData };
