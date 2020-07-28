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
  label: '',
  slices: {
    children: [
      {
        name: 0,
        size: 378611,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 1000,
        size: 205997,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 2000,
        size: 397189,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 3000,
        size: 397195,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 4000,
        size: 398429,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 5000,
        size: 397843,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 6000,
        size: 398140,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 7000,
        size: 398076,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 8000,
        size: 396746,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 9000,
        size: 397418,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 10000,
        size: 20222,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 11000,
        size: 20173,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 12000,
        size: 20026,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 13000,
        size: 19986,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 14000,
        size: 20091,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 15000,
        size: 20052,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 16000,
        size: 20349,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 17000,
        size: 20290,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 18000,
        size: 20399,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 19000,
        size: 20133,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
      {
        name: 20000,
        size: 9,
        aggConfig: {
          type: 'histogram',
          schema: 'segment',
          fieldFormatter: _.constant(String),
          params: {
            interval: 1000,
            extended_bounds: {},
          },
        },
      },
    ],
  },
  names: [
    0,
    1000,
    2000,
    3000,
    4000,
    5000,
    6000,
    7000,
    8000,
    9000,
    10000,
    11000,
    12000,
    13000,
    14000,
    15000,
    16000,
    17000,
    18000,
    19000,
    20000,
  ],
  hits: 3967374,
  tooltipFormatter: function (event) {
    return event.point;
  },
};
