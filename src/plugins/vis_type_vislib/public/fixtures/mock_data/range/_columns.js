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

export default {
  columns: [
    {
      label: 'apache: _type',
      xAxisLabel: 'bytes ranges',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: '0.0-1000.0',
              y: 13309,
            },
            {
              x: '1000.0-2000.0',
              y: 7196,
            },
          ],
        },
      ],
    },
    {
      label: 'nginx: _type',
      xAxisLabel: 'bytes ranges',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: '0.0-1000.0',
              y: 3278,
            },
            {
              x: '1000.0-2000.0',
              y: 1804,
            },
          ],
        },
      ],
    },
  ],
  hits: 171499,
  xAxisOrderedValues: ['0.0-1000.0', '1000.0-2000.0'],
  xAxisFormatter: function (val) {
    if (_.isObject(val)) {
      return JSON.stringify(val);
    } else if (val == null) {
      return '';
    } else {
      return '' + val;
    }
  },
  tooltipFormatter: function (d) {
    return d;
  },
};
