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

export const tabifiedData = {
  metricOnly: {
    tables: [
      {
        columns: [
          {
            id: 'col-0-1',
            name: 'Count',
          },
        ],
        rows: [
          {
            'col-0-1': 1000,
          },
        ],
      },
    ],
  },
  threeTermBuckets: {
    tables: [
      {
        columns: [
          {
            id: 'col-0-agg_2',
            name: 'extension: Descending',
          },
          {
            id: 'col-1-agg_1',
            name: 'Average bytes',
          },
          {
            id: 'col-2-agg_3',
            name: 'geo.src: Descending',
          },
          {
            id: 'col-3-agg_1',
            name: 'Average bytes',
          },
          {
            id: 'col-4-agg_4',
            name: 'machine.os: Descending',
          },
          {
            id: 'col-5-agg_1',
            name: 'Average bytes',
          },
        ],
        rows: [
          {
            'col-0-agg_2': 'png',
            'col-2-agg_3': 'IT',
            'col-4-agg_4': 'win',
            'col-1-agg_1': 412032,
            'col-3-agg_1': 9299,
            'col-5-agg_1': 0,
          },
          {
            'col-0-agg_2': 'png',
            'col-2-agg_3': 'IT',
            'col-4-agg_4': 'mac',
            'col-1-agg_1': 412032,
            'col-3-agg_1': 9299,
            'col-5-agg_1': 9299,
          },
          {
            'col-0-agg_2': 'png',
            'col-2-agg_3': 'US',
            'col-4-agg_4': 'linux',
            'col-1-agg_1': 412032,
            'col-3-agg_1': 8293,
            'col-5-agg_1': 3992,
          },
          {
            'col-0-agg_2': 'png',
            'col-2-agg_3': 'US',
            'col-4-agg_4': 'mac',
            'col-1-agg_1': 412032,
            'col-3-agg_1': 8293,
            'col-5-agg_1': 3029,
          },
          {
            'col-0-agg_2': 'css',
            'col-2-agg_3': 'MX',
            'col-4-agg_4': 'win',
            'col-1-agg_1': 412032,
            'col-3-agg_1': 9299,
            'col-5-agg_1': 4992,
          },
          {
            'col-0-agg_2': 'css',
            'col-2-agg_3': 'MX',
            'col-4-agg_4': 'mac',
            'col-1-agg_1': 412032,
            'col-3-agg_1': 9299,
            'col-5-agg_1': 5892,
          },
          {
            'col-0-agg_2': 'css',
            'col-2-agg_3': 'US',
            'col-4-agg_4': 'linux',
            'col-1-agg_1': 412032,
            'col-3-agg_1': 8293,
            'col-5-agg_1': 3992,
          },
          {
            'col-0-agg_2': 'css',
            'col-2-agg_3': 'US',
            'col-4-agg_4': 'mac',
            'col-1-agg_1': 412032,
            'col-3-agg_1': 8293,
            'col-5-agg_1': 3029,
          },
          {
            'col-0-agg_2': 'html',
            'col-2-agg_3': 'CN',
            'col-4-agg_4': 'win',
            'col-1-agg_1': 412032,
            'col-3-agg_1': 9299,
            'col-5-agg_1': 4992,
          },
          {
            'col-0-agg_2': 'html',
            'col-2-agg_3': 'CN',
            'col-4-agg_4': 'mac',
            'col-1-agg_1': 412032,
            'col-3-agg_1': 9299,
            'col-5-agg_1': 5892,
          },
          {
            'col-0-agg_2': 'html',
            'col-2-agg_3': 'FR',
            'col-4-agg_4': 'win',
            'col-1-agg_1': 412032,
            'col-3-agg_1': 8293,
            'col-5-agg_1': 3992,
          },
          {
            'col-0-agg_2': 'html',
            'col-2-agg_3': 'FR',
            'col-4-agg_4': 'mac',
            'col-1-agg_1': 412032,
            'col-3-agg_1': 8293,
            'col-5-agg_1': 3029,
          },
        ],
      },
    ],
  },
  threeTermBucketsWithSplit: {
    tables: [
      {
        title: 'png: extension: Descending',
        name: 'extension: Descending',
        key: 'png',
        column: 0,
        row: 0,
        table: {
          columns: [
            {
              id: 'col-0-agg_2',
              name: 'extension: Descending',
            },
            {
              id: 'col-1-agg_3',
              name: 'geo.src: Descending',
            },
            {
              id: 'col-2-agg_4',
              name: 'machine.os: Descending',
            },
            {
              id: 'col-3-agg_1',
              name: 'Average bytes',
            },
          ],
          rows: [
            {
              'col-0-agg_2': 'png',
              'col-1-agg_3': 'IT',
              'col-2-agg_4': 'win',
              'col-3-agg_1': 0,
            },
            {
              'col-0-agg_2': 'png',
              'col-1-agg_3': 'IT',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 9299,
            },
            {
              'col-0-agg_2': 'png',
              'col-1-agg_3': 'US',
              'col-2-agg_4': 'linux',
              'col-3-agg_1': 3992,
            },
            {
              'col-0-agg_2': 'png',
              'col-1-agg_3': 'US',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 3029,
            },
            {
              'col-0-agg_2': 'css',
              'col-1-agg_3': 'MX',
              'col-2-agg_4': 'win',
              'col-3-agg_1': 4992,
            },
            {
              'col-0-agg_2': 'css',
              'col-1-agg_3': 'MX',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 5892,
            },
            {
              'col-0-agg_2': 'css',
              'col-1-agg_3': 'US',
              'col-2-agg_4': 'linux',
              'col-3-agg_1': 3992,
            },
            {
              'col-0-agg_2': 'css',
              'col-1-agg_3': 'US',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 3029,
            },
            {
              'col-0-agg_2': 'html',
              'col-1-agg_3': 'CN',
              'col-2-agg_4': 'win',
              'col-3-agg_1': 4992,
            },
            {
              'col-0-agg_2': 'html',
              'col-1-agg_3': 'CN',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 5892,
            },
            {
              'col-0-agg_2': 'html',
              'col-1-agg_3': 'FR',
              'col-2-agg_4': 'win',
              'col-3-agg_1': 3992,
            },
            {
              'col-0-agg_2': 'html',
              'col-1-agg_3': 'FR',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 3029,
            },
          ],
        },
        tables: [
          {
            columns: [
              {
                id: 'col-0-agg_2',
                name: 'extension: Descending',
              },
              {
                id: 'col-1-agg_3',
                name: 'geo.src: Descending',
              },
              {
                id: 'col-2-agg_4',
                name: 'machine.os: Descending',
              },
              {
                id: 'col-3-agg_1',
                name: 'Average bytes',
              },
            ],
            rows: [
              {
                'col-0-agg_2': 'png',
                'col-1-agg_3': 'IT',
                'col-2-agg_4': 'win',
                'col-3-agg_1': 0,
              },
              {
                'col-0-agg_2': 'png',
                'col-1-agg_3': 'IT',
                'col-2-agg_4': 'mac',
                'col-3-agg_1': 9299,
              },
              {
                'col-0-agg_2': 'png',
                'col-1-agg_3': 'US',
                'col-2-agg_4': 'linux',
                'col-3-agg_1': 3992,
              },
              {
                'col-0-agg_2': 'png',
                'col-1-agg_3': 'US',
                'col-2-agg_4': 'mac',
                'col-3-agg_1': 3029,
              },
            ],
          },
        ],
      },
      {
        title: 'css: extension: Descending',
        name: 'extension: Descending',
        key: 'css',
        column: 0,
        row: 4,
        table: {
          columns: [
            {
              id: 'col-0-agg_2',
              name: 'extension: Descending',
            },
            {
              id: 'col-1-agg_3',
              name: 'geo.src: Descending',
            },
            {
              id: 'col-2-agg_4',
              name: 'machine.os: Descending',
            },
            {
              id: 'col-3-agg_1',
              name: 'Average bytes',
            },
          ],
          rows: [
            {
              'col-0-agg_2': 'png',
              'col-1-agg_3': 'IT',
              'col-2-agg_4': 'win',
              'col-3-agg_1': 0,
            },
            {
              'col-0-agg_2': 'png',
              'col-1-agg_3': 'IT',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 9299,
            },
            {
              'col-0-agg_2': 'png',
              'col-1-agg_3': 'US',
              'col-2-agg_4': 'linux',
              'col-3-agg_1': 3992,
            },
            {
              'col-0-agg_2': 'png',
              'col-1-agg_3': 'US',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 3029,
            },
            {
              'col-0-agg_2': 'css',
              'col-1-agg_3': 'MX',
              'col-2-agg_4': 'win',
              'col-3-agg_1': 4992,
            },
            {
              'col-0-agg_2': 'css',
              'col-1-agg_3': 'MX',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 5892,
            },
            {
              'col-0-agg_2': 'css',
              'col-1-agg_3': 'US',
              'col-2-agg_4': 'linux',
              'col-3-agg_1': 3992,
            },
            {
              'col-0-agg_2': 'css',
              'col-1-agg_3': 'US',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 3029,
            },
            {
              'col-0-agg_2': 'html',
              'col-1-agg_3': 'CN',
              'col-2-agg_4': 'win',
              'col-3-agg_1': 4992,
            },
            {
              'col-0-agg_2': 'html',
              'col-1-agg_3': 'CN',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 5892,
            },
            {
              'col-0-agg_2': 'html',
              'col-1-agg_3': 'FR',
              'col-2-agg_4': 'win',
              'col-3-agg_1': 3992,
            },
            {
              'col-0-agg_2': 'html',
              'col-1-agg_3': 'FR',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 3029,
            },
          ],
        },
        tables: [
          {
            columns: [
              {
                id: 'col-0-agg_2',
                name: 'extension: Descending',
              },
              {
                id: 'col-1-agg_3',
                name: 'geo.src: Descending',
              },
              {
                id: 'col-2-agg_4',
                name: 'machine.os: Descending',
              },
              {
                id: 'col-3-agg_1',
                name: 'Average bytes',
              },
            ],
            rows: [
              {
                'col-0-agg_2': 'css',
                'col-1-agg_3': 'MX',
                'col-2-agg_4': 'win',
                'col-3-agg_1': 4992,
              },
              {
                'col-0-agg_2': 'css',
                'col-1-agg_3': 'MX',
                'col-2-agg_4': 'mac',
                'col-3-agg_1': 5892,
              },
              {
                'col-0-agg_2': 'css',
                'col-1-agg_3': 'US',
                'col-2-agg_4': 'linux',
                'col-3-agg_1': 3992,
              },
              {
                'col-0-agg_2': 'css',
                'col-1-agg_3': 'US',
                'col-2-agg_4': 'mac',
                'col-3-agg_1': 3029,
              },
            ],
          },
        ],
      },
      {
        title: 'html: extension: Descending',
        name: 'extension: Descending',
        key: 'html',
        column: 0,
        row: 8,
        table: {
          columns: [
            {
              id: 'col-0-agg_2',
              name: 'extension: Descending',
            },
            {
              id: 'col-1-agg_3',
              name: 'geo.src: Descending',
            },
            {
              id: 'col-2-agg_4',
              name: 'machine.os: Descending',
            },
            {
              id: 'col-3-agg_1',
              name: 'Average bytes',
            },
          ],
          rows: [
            {
              'col-0-agg_2': 'png',
              'col-1-agg_3': 'IT',
              'col-2-agg_4': 'win',
              'col-3-agg_1': 0,
            },
            {
              'col-0-agg_2': 'png',
              'col-1-agg_3': 'IT',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 9299,
            },
            {
              'col-0-agg_2': 'png',
              'col-1-agg_3': 'US',
              'col-2-agg_4': 'linux',
              'col-3-agg_1': 3992,
            },
            {
              'col-0-agg_2': 'png',
              'col-1-agg_3': 'US',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 3029,
            },
            {
              'col-0-agg_2': 'css',
              'col-1-agg_3': 'MX',
              'col-2-agg_4': 'win',
              'col-3-agg_1': 4992,
            },
            {
              'col-0-agg_2': 'css',
              'col-1-agg_3': 'MX',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 5892,
            },
            {
              'col-0-agg_2': 'css',
              'col-1-agg_3': 'US',
              'col-2-agg_4': 'linux',
              'col-3-agg_1': 3992,
            },
            {
              'col-0-agg_2': 'css',
              'col-1-agg_3': 'US',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 3029,
            },
            {
              'col-0-agg_2': 'html',
              'col-1-agg_3': 'CN',
              'col-2-agg_4': 'win',
              'col-3-agg_1': 4992,
            },
            {
              'col-0-agg_2': 'html',
              'col-1-agg_3': 'CN',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 5892,
            },
            {
              'col-0-agg_2': 'html',
              'col-1-agg_3': 'FR',
              'col-2-agg_4': 'win',
              'col-3-agg_1': 3992,
            },
            {
              'col-0-agg_2': 'html',
              'col-1-agg_3': 'FR',
              'col-2-agg_4': 'mac',
              'col-3-agg_1': 3029,
            },
          ],
        },
        tables: [
          {
            columns: [
              {
                id: 'col-0-agg_2',
                name: 'extension: Descending',
              },
              {
                id: 'col-1-agg_3',
                name: 'geo.src: Descending',
              },
              {
                id: 'col-2-agg_4',
                name: 'machine.os: Descending',
              },
              {
                id: 'col-3-agg_1',
                name: 'Average bytes',
              },
            ],
            rows: [
              {
                'col-0-agg_2': 'html',
                'col-1-agg_3': 'CN',
                'col-2-agg_4': 'win',
                'col-3-agg_1': 4992,
              },
              {
                'col-0-agg_2': 'html',
                'col-1-agg_3': 'CN',
                'col-2-agg_4': 'mac',
                'col-3-agg_1': 5892,
              },
              {
                'col-0-agg_2': 'html',
                'col-1-agg_3': 'FR',
                'col-2-agg_4': 'win',
                'col-3-agg_1': 3992,
              },
              {
                'col-0-agg_2': 'html',
                'col-1-agg_3': 'FR',
                'col-2-agg_4': 'mac',
                'col-3-agg_1': 3029,
              },
            ],
          },
        ],
      },
    ],
    direction: 'row',
  },
  oneTermOneHistogramBucketWithTwoMetricsOneTopHitOneDerivative: {
    tables: [
      {
        columns: [
          {
            id: 'col-0-agg_3',
            name: 'extension: Descending',
          },
          {
            id: 'col-1-agg_4',
            name: '@timestamp per day',
          },
          {
            id: 'col-2-agg_1',
            name: 'Average bytes',
          },
          {
            id: 'col-3-agg_2',
            name: 'Min @timestamp',
          },
          {
            id: 'col-4-agg_5',
            name: 'Derivative of Count',
          },
          {
            id: 'col-5-agg_6',
            name: 'Last bytes',
          },
        ],
        rows: [
          {
            'col-0-agg_3': 'png',
            'col-1-agg_4': 1411862400000,
            'col-2-agg_1': 9283,
            'col-3-agg_2': 1411862400000,
            'col-5-agg_6': 23,
          },
          {
            'col-0-agg_3': 'png',
            'col-1-agg_4': 1411948800000,
            'col-2-agg_1': 28349,
            'col-3-agg_2': 1411948800000,
            'col-4-agg_5': 203,
            'col-5-agg_6': 39,
          },
          {
            'col-0-agg_3': 'png',
            'col-1-agg_4': 1412035200000,
            'col-2-agg_1': 84330,
            'col-3-agg_2': 1412035200000,
            'col-4-agg_5': 200,
            'col-5-agg_6': 329,
          },
          {
            'col-0-agg_3': 'png',
            'col-1-agg_4': 1412121600000,
            'col-2-agg_1': 34992,
            'col-3-agg_2': 1412121600000,
            'col-4-agg_5': 103,
            'col-5-agg_6': 22,
          },
          {
            'col-0-agg_3': 'png',
            'col-1-agg_4': 1412208000000,
            'col-2-agg_1': 145432,
            'col-3-agg_2': 1412208000000,
            'col-4-agg_5': 153,
            'col-5-agg_6': 93,
          },
          {
            'col-0-agg_3': 'png',
            'col-1-agg_4': 1412294400000,
            'col-2-agg_1': 220943,
            'col-3-agg_2': 1412294400000,
            'col-4-agg_5': 239,
            'col-5-agg_6': 72,
          },
          {
            'col-0-agg_3': 'css',
            'col-1-agg_4': 1411862400000,
            'col-2-agg_1': 9283,
            'col-3-agg_2': 1411862400000,
            'col-5-agg_6': 75,
          },
          {
            'col-0-agg_3': 'css',
            'col-1-agg_4': 1411948800000,
            'col-2-agg_1': 28349,
            'col-3-agg_2': 1411948800000,
            'col-4-agg_5': 10,
            'col-5-agg_6': 11,
          },
          {
            'col-0-agg_3': 'css',
            'col-1-agg_4': 1412035200000,
            'col-2-agg_1': 84330,
            'col-3-agg_2': 1412035200000,
            'col-4-agg_5': 24,
            'col-5-agg_6': 238,
          },
          {
            'col-0-agg_3': 'css',
            'col-1-agg_4': 1412121600000,
            'col-2-agg_1': 34992,
            'col-3-agg_2': 1412121600000,
            'col-4-agg_5': 49,
            'col-5-agg_6': 343,
          },
          {
            'col-0-agg_3': 'css',
            'col-1-agg_4': 1412208000000,
            'col-2-agg_1': 145432,
            'col-3-agg_2': 1412208000000,
            'col-4-agg_5': 100,
            'col-5-agg_6': 837,
          },
          {
            'col-0-agg_3': 'css',
            'col-1-agg_4': 1412294400000,
            'col-2-agg_1': 220943,
            'col-3-agg_2': 1412294400000,
            'col-4-agg_5': 23,
            'col-5-agg_6': 302,
          },
          {
            'col-0-agg_3': 'html',
            'col-1-agg_4': 1411862400000,
            'col-2-agg_1': 9283,
            'col-3-agg_2': 1411862400000,
            'col-5-agg_6': 30,
          },
          {
            'col-0-agg_3': 'html',
            'col-1-agg_4': 1411948800000,
            'col-2-agg_1': 28349,
            'col-3-agg_2': 1411948800000,
            'col-4-agg_5': 1,
            'col-5-agg_6': 43,
          },
          {
            'col-0-agg_3': 'html',
            'col-1-agg_4': 1412035200000,
            'col-2-agg_1': 84330,
            'col-3-agg_2': 1412035200000,
            'col-4-agg_5': 5,
            'col-5-agg_6': 88,
          },
          {
            'col-0-agg_3': 'html',
            'col-1-agg_4': 1412121600000,
            'col-2-agg_1': 34992,
            'col-3-agg_2': 1412121600000,
            'col-4-agg_5': 10,
            'col-5-agg_6': 91,
          },
          {
            'col-0-agg_3': 'html',
            'col-1-agg_4': 1412208000000,
            'col-2-agg_1': 145432,
            'col-3-agg_2': 1412208000000,
            'col-4-agg_5': 43,
            'col-5-agg_6': 534,
          },
          {
            'col-0-agg_3': 'html',
            'col-1-agg_4': 1412294400000,
            'col-2-agg_1': 220943,
            'col-3-agg_2': 1412294400000,
            'col-4-agg_5': 1,
            'col-5-agg_6': 553,
          },
        ],
      },
    ],
  },
};
