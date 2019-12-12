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

const DEBOUNCE_DELAY = 50;
// ensure legend is the same height with or without a caption so legend items do not move around
const emptyCaption = '<br>';

const staticDefaultOptions = {
  xaxis: {
    mode: 'time',
    tickLength: 5,
    timezone: 'browser',
  },
  selection: {
    mode: 'x',
    color: '#ccc',
  },
  crosshair: {
    mode: 'x',
    color: '#C66',
    lineWidth: 2,
  },
  colors: [
    '#01A4A4',
    '#C66',
    '#D0D102',
    '#616161',
    '#00A1CB',
    '#32742C',
    '#F18D05',
    '#113F8C',
    '#61AE24',
    '#D70060',
  ],
};

export { DEBOUNCE_DELAY, emptyCaption, staticDefaultOptions };
