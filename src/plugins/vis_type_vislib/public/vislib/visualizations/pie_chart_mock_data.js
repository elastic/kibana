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

export const pieChartMockData = {
  rowData: {
    rows: [
      {
        hits: 4,
        raw: {
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
              name: 'machine.os: Descending',
            },
            {
              id: 'col-3-agg_1',
              name: 'Average bytes',
            },
            {
              id: 'col-4-agg_4',
              name: 'geo.src: Descending',
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
          ],
        },
        names: ['IT', 'win', 'mac', 'US', 'linux'],
        slices: {
          children: [
            {
              name: 'IT',
              size: 9299,
              children: [
                {
                  name: 'win',
                  size: 0,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
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
                      ],
                    },
                    row: 0,
                    column: 4,
                    value: 'win',
                  },
                },
                {
                  name: 'mac',
                  size: 9299,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
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
                      ],
                    },
                    row: 1,
                    column: 4,
                    value: 'mac',
                  },
                },
              ],
              rawData: {
                table: {
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
                      name: 'machine.os: Descending',
                    },
                    {
                      id: 'col-3-agg_1',
                      name: 'Average bytes',
                    },
                    {
                      id: 'col-4-agg_4',
                      name: 'geo.src: Descending',
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
                  ],
                },
                row: 0,
                column: 2,
                value: 'IT',
              },
            },
            {
              name: 'US',
              size: 8293,
              children: [
                {
                  name: 'linux',
                  size: 3992,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
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
                      ],
                    },
                    row: 2,
                    column: 4,
                    value: 'linux',
                  },
                },
                {
                  name: 'mac',
                  size: 3029,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
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
                      ],
                    },
                    row: 3,
                    column: 4,
                    value: 'mac',
                  },
                },
              ],
              rawData: {
                table: {
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
                      name: 'machine.os: Descending',
                    },
                    {
                      id: 'col-3-agg_1',
                      name: 'Average bytes',
                    },
                    {
                      id: 'col-4-agg_4',
                      name: 'geo.src: Descending',
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
                  ],
                },
                row: 2,
                column: 2,
                value: 'US',
              },
            },
          ],
        },
        label: 'png: extension: Descending',
      },
      {
        hits: 4,
        raw: {
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
              name: 'machine.os: Descending',
            },
            {
              id: 'col-3-agg_1',
              name: 'Average bytes',
            },
            {
              id: 'col-4-agg_4',
              name: 'geo.src: Descending',
            },
            {
              id: 'col-5-agg_1',
              name: 'Average bytes',
            },
          ],
          rows: [
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
          ],
        },
        names: ['MX', 'win', 'mac', 'US', 'linux'],
        slices: {
          children: [
            {
              name: 'MX',
              size: 9299,
              children: [
                {
                  name: 'win',
                  size: 4992,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                      ],
                    },
                    row: 0,
                    column: 4,
                    value: 'win',
                  },
                },
                {
                  name: 'mac',
                  size: 5892,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                      ],
                    },
                    row: 1,
                    column: 4,
                    value: 'mac',
                  },
                },
              ],
              rawData: {
                table: {
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
                      name: 'machine.os: Descending',
                    },
                    {
                      id: 'col-3-agg_1',
                      name: 'Average bytes',
                    },
                    {
                      id: 'col-4-agg_4',
                      name: 'geo.src: Descending',
                    },
                    {
                      id: 'col-5-agg_1',
                      name: 'Average bytes',
                    },
                  ],
                  rows: [
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
                  ],
                },
                row: 0,
                column: 2,
                value: 'MX',
              },
            },
            {
              name: 'US',
              size: 8293,
              children: [
                {
                  name: 'linux',
                  size: 3992,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                      ],
                    },
                    row: 2,
                    column: 4,
                    value: 'linux',
                  },
                },
                {
                  name: 'mac',
                  size: 3029,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                      ],
                    },
                    row: 3,
                    column: 4,
                    value: 'mac',
                  },
                },
              ],
              rawData: {
                table: {
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
                      name: 'machine.os: Descending',
                    },
                    {
                      id: 'col-3-agg_1',
                      name: 'Average bytes',
                    },
                    {
                      id: 'col-4-agg_4',
                      name: 'geo.src: Descending',
                    },
                    {
                      id: 'col-5-agg_1',
                      name: 'Average bytes',
                    },
                  ],
                  rows: [
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
                  ],
                },
                row: 2,
                column: 2,
                value: 'US',
              },
            },
          ],
        },
        label: 'css: extension: Descending',
      },
      {
        hits: 4,
        raw: {
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
              name: 'machine.os: Descending',
            },
            {
              id: 'col-3-agg_1',
              name: 'Average bytes',
            },
            {
              id: 'col-4-agg_4',
              name: 'geo.src: Descending',
            },
            {
              id: 'col-5-agg_1',
              name: 'Average bytes',
            },
          ],
          rows: [
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
        names: ['CN', 'win', 'mac', 'FR'],
        slices: {
          children: [
            {
              name: 'CN',
              size: 9299,
              children: [
                {
                  name: 'win',
                  size: 4992,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                    row: 0,
                    column: 4,
                    value: 'win',
                  },
                },
                {
                  name: 'mac',
                  size: 5892,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                    row: 1,
                    column: 4,
                    value: 'mac',
                  },
                },
              ],
              rawData: {
                table: {
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
                      name: 'machine.os: Descending',
                    },
                    {
                      id: 'col-3-agg_1',
                      name: 'Average bytes',
                    },
                    {
                      id: 'col-4-agg_4',
                      name: 'geo.src: Descending',
                    },
                    {
                      id: 'col-5-agg_1',
                      name: 'Average bytes',
                    },
                  ],
                  rows: [
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
                row: 0,
                column: 2,
                value: 'CN',
              },
            },
            {
              name: 'FR',
              size: 8293,
              children: [
                {
                  name: 'win',
                  size: 3992,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                    row: 2,
                    column: 4,
                    value: 'win',
                  },
                },
                {
                  name: 'mac',
                  size: 3029,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                    row: 3,
                    column: 4,
                    value: 'mac',
                  },
                },
              ],
              rawData: {
                table: {
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
                      name: 'machine.os: Descending',
                    },
                    {
                      id: 'col-3-agg_1',
                      name: 'Average bytes',
                    },
                    {
                      id: 'col-4-agg_4',
                      name: 'geo.src: Descending',
                    },
                    {
                      id: 'col-5-agg_1',
                      name: 'Average bytes',
                    },
                  ],
                  rows: [
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
                row: 2,
                column: 2,
                value: 'FR',
              },
            },
          ],
        },
        label: 'html: extension: Descending',
      },
    ],
    hits: 12,
  },
  columnData: {
    columns: [
      {
        hits: 4,
        raw: {
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
              name: 'machine.os: Descending',
            },
            {
              id: 'col-3-agg_1',
              name: 'Average bytes',
            },
            {
              id: 'col-4-agg_4',
              name: 'geo.src: Descending',
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
          ],
        },
        names: ['IT', 'win', 'mac', 'US', 'linux'],
        slices: {
          children: [
            {
              name: 'IT',
              size: 9299,
              children: [
                {
                  name: 'win',
                  size: 0,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
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
                      ],
                    },
                    row: 0,
                    column: 4,
                    value: 'win',
                  },
                },
                {
                  name: 'mac',
                  size: 9299,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
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
                      ],
                    },
                    row: 1,
                    column: 4,
                    value: 'mac',
                  },
                },
              ],
              rawData: {
                table: {
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
                      name: 'machine.os: Descending',
                    },
                    {
                      id: 'col-3-agg_1',
                      name: 'Average bytes',
                    },
                    {
                      id: 'col-4-agg_4',
                      name: 'geo.src: Descending',
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
                  ],
                },
                row: 0,
                column: 2,
                value: 'IT',
              },
            },
            {
              name: 'US',
              size: 8293,
              children: [
                {
                  name: 'linux',
                  size: 3992,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
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
                      ],
                    },
                    row: 2,
                    column: 4,
                    value: 'linux',
                  },
                },
                {
                  name: 'mac',
                  size: 3029,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
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
                      ],
                    },
                    row: 3,
                    column: 4,
                    value: 'mac',
                  },
                },
              ],
              rawData: {
                table: {
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
                      name: 'machine.os: Descending',
                    },
                    {
                      id: 'col-3-agg_1',
                      name: 'Average bytes',
                    },
                    {
                      id: 'col-4-agg_4',
                      name: 'geo.src: Descending',
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
                  ],
                },
                row: 2,
                column: 2,
                value: 'US',
              },
            },
          ],
        },
        label: 'png: extension: Descending',
      },
      {
        hits: 4,
        raw: {
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
              name: 'machine.os: Descending',
            },
            {
              id: 'col-3-agg_1',
              name: 'Average bytes',
            },
            {
              id: 'col-4-agg_4',
              name: 'geo.src: Descending',
            },
            {
              id: 'col-5-agg_1',
              name: 'Average bytes',
            },
          ],
          rows: [
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
          ],
        },
        names: ['MX', 'win', 'mac', 'US', 'linux'],
        slices: {
          children: [
            {
              name: 'MX',
              size: 9299,
              children: [
                {
                  name: 'win',
                  size: 4992,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                      ],
                    },
                    row: 0,
                    column: 4,
                    value: 'win',
                  },
                },
                {
                  name: 'mac',
                  size: 5892,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                      ],
                    },
                    row: 1,
                    column: 4,
                    value: 'mac',
                  },
                },
              ],
              rawData: {
                table: {
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
                      name: 'machine.os: Descending',
                    },
                    {
                      id: 'col-3-agg_1',
                      name: 'Average bytes',
                    },
                    {
                      id: 'col-4-agg_4',
                      name: 'geo.src: Descending',
                    },
                    {
                      id: 'col-5-agg_1',
                      name: 'Average bytes',
                    },
                  ],
                  rows: [
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
                  ],
                },
                row: 0,
                column: 2,
                value: 'MX',
              },
            },
            {
              name: 'US',
              size: 8293,
              children: [
                {
                  name: 'linux',
                  size: 3992,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                      ],
                    },
                    row: 2,
                    column: 4,
                    value: 'linux',
                  },
                },
                {
                  name: 'mac',
                  size: 3029,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                      ],
                    },
                    row: 3,
                    column: 4,
                    value: 'mac',
                  },
                },
              ],
              rawData: {
                table: {
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
                      name: 'machine.os: Descending',
                    },
                    {
                      id: 'col-3-agg_1',
                      name: 'Average bytes',
                    },
                    {
                      id: 'col-4-agg_4',
                      name: 'geo.src: Descending',
                    },
                    {
                      id: 'col-5-agg_1',
                      name: 'Average bytes',
                    },
                  ],
                  rows: [
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
                  ],
                },
                row: 2,
                column: 2,
                value: 'US',
              },
            },
          ],
        },
        label: 'css: extension: Descending',
      },
      {
        hits: 4,
        raw: {
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
              name: 'machine.os: Descending',
            },
            {
              id: 'col-3-agg_1',
              name: 'Average bytes',
            },
            {
              id: 'col-4-agg_4',
              name: 'geo.src: Descending',
            },
            {
              id: 'col-5-agg_1',
              name: 'Average bytes',
            },
          ],
          rows: [
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
        names: ['CN', 'win', 'mac', 'FR'],
        slices: {
          children: [
            {
              name: 'CN',
              size: 9299,
              children: [
                {
                  name: 'win',
                  size: 4992,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                    row: 0,
                    column: 4,
                    value: 'win',
                  },
                },
                {
                  name: 'mac',
                  size: 5892,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                    row: 1,
                    column: 4,
                    value: 'mac',
                  },
                },
              ],
              rawData: {
                table: {
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
                      name: 'machine.os: Descending',
                    },
                    {
                      id: 'col-3-agg_1',
                      name: 'Average bytes',
                    },
                    {
                      id: 'col-4-agg_4',
                      name: 'geo.src: Descending',
                    },
                    {
                      id: 'col-5-agg_1',
                      name: 'Average bytes',
                    },
                  ],
                  rows: [
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
                row: 0,
                column: 2,
                value: 'CN',
              },
            },
            {
              name: 'FR',
              size: 8293,
              children: [
                {
                  name: 'win',
                  size: 3992,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                    row: 2,
                    column: 4,
                    value: 'win',
                  },
                },
                {
                  name: 'mac',
                  size: 3029,
                  children: [],
                  rawData: {
                    table: {
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
                          name: 'machine.os: Descending',
                        },
                        {
                          id: 'col-3-agg_1',
                          name: 'Average bytes',
                        },
                        {
                          id: 'col-4-agg_4',
                          name: 'geo.src: Descending',
                        },
                        {
                          id: 'col-5-agg_1',
                          name: 'Average bytes',
                        },
                      ],
                      rows: [
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
                    row: 3,
                    column: 4,
                    value: 'mac',
                  },
                },
              ],
              rawData: {
                table: {
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
                      name: 'machine.os: Descending',
                    },
                    {
                      id: 'col-3-agg_1',
                      name: 'Average bytes',
                    },
                    {
                      id: 'col-4-agg_4',
                      name: 'geo.src: Descending',
                    },
                    {
                      id: 'col-5-agg_1',
                      name: 'Average bytes',
                    },
                  ],
                  rows: [
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
                row: 2,
                column: 2,
                value: 'FR',
              },
            },
          ],
        },
        label: 'html: extension: Descending',
      },
    ],
    hits: 12,
  },
  sliceData: {
    hits: 6,
    raw: {
      columns: [
        {
          id: 'col-0-agg_2',
          name: 'machine.os: Descending',
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
      ],
      rows: [
        {
          'col-0-agg_2': 'png',
          'col-2-agg_3': 'IT',
          'col-1-agg_1': 412032,
          'col-3-agg_1': 9299,
        },
        {
          'col-0-agg_2': 'png',
          'col-2-agg_3': 'US',
          'col-1-agg_1': 412032,
          'col-3-agg_1': 8293,
        },
        {
          'col-0-agg_2': 'css',
          'col-2-agg_3': 'MX',
          'col-1-agg_1': 412032,
          'col-3-agg_1': 9299,
        },
        {
          'col-0-agg_2': 'css',
          'col-2-agg_3': 'US',
          'col-1-agg_1': 412032,
          'col-3-agg_1': 8293,
        },
        {
          'col-0-agg_2': 'html',
          'col-2-agg_3': 'CN',
          'col-1-agg_1': 412032,
          'col-3-agg_1': 9299,
        },
        {
          'col-0-agg_2': 'html',
          'col-2-agg_3': 'FR',
          'col-1-agg_1': 412032,
          'col-3-agg_1': 8293,
        },
      ],
    },
    names: ['png', 'IT', 'US', 'css', 'MX', 'html', 'CN', 'FR'],
    slices: {
      children: [
        {
          name: 'png',
          size: 412032,
          children: [
            {
              name: 'IT',
              size: 9299,
              children: [],
              rawData: {
                table: {
                  columns: [
                    {
                      id: 'col-0-agg_2',
                      name: 'machine.os: Descending',
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
                  ],
                  rows: [
                    {
                      'col-0-agg_2': 'png',
                      'col-2-agg_3': 'IT',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'png',
                      'col-2-agg_3': 'US',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                    {
                      'col-0-agg_2': 'css',
                      'col-2-agg_3': 'MX',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'css',
                      'col-2-agg_3': 'US',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                    {
                      'col-0-agg_2': 'html',
                      'col-2-agg_3': 'CN',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'html',
                      'col-2-agg_3': 'FR',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                  ],
                },
                row: 0,
                column: 2,
                value: 'IT',
              },
            },
            {
              name: 'US',
              size: 8293,
              children: [],
              rawData: {
                table: {
                  columns: [
                    {
                      id: 'col-0-agg_2',
                      name: 'machine.os: Descending',
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
                  ],
                  rows: [
                    {
                      'col-0-agg_2': 'png',
                      'col-2-agg_3': 'IT',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'png',
                      'col-2-agg_3': 'US',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                    {
                      'col-0-agg_2': 'css',
                      'col-2-agg_3': 'MX',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'css',
                      'col-2-agg_3': 'US',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                    {
                      'col-0-agg_2': 'html',
                      'col-2-agg_3': 'CN',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'html',
                      'col-2-agg_3': 'FR',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                  ],
                },
                row: 1,
                column: 2,
                value: 'US',
              },
            },
          ],
          rawData: {
            table: {
              columns: [
                {
                  id: 'col-0-agg_2',
                  name: 'machine.os: Descending',
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
              ],
              rows: [
                {
                  'col-0-agg_2': 'png',
                  'col-2-agg_3': 'IT',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 9299,
                },
                {
                  'col-0-agg_2': 'png',
                  'col-2-agg_3': 'US',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 8293,
                },
                {
                  'col-0-agg_2': 'css',
                  'col-2-agg_3': 'MX',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 9299,
                },
                {
                  'col-0-agg_2': 'css',
                  'col-2-agg_3': 'US',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 8293,
                },
                {
                  'col-0-agg_2': 'html',
                  'col-2-agg_3': 'CN',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 9299,
                },
                {
                  'col-0-agg_2': 'html',
                  'col-2-agg_3': 'FR',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 8293,
                },
              ],
            },
            row: 0,
            column: 0,
            value: 'png',
          },
        },
        {
          name: 'css',
          size: 412032,
          children: [
            {
              name: 'MX',
              size: 9299,
              children: [],
              rawData: {
                table: {
                  columns: [
                    {
                      id: 'col-0-agg_2',
                      name: 'machine.os: Descending',
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
                  ],
                  rows: [
                    {
                      'col-0-agg_2': 'png',
                      'col-2-agg_3': 'IT',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'png',
                      'col-2-agg_3': 'US',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                    {
                      'col-0-agg_2': 'css',
                      'col-2-agg_3': 'MX',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'css',
                      'col-2-agg_3': 'US',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                    {
                      'col-0-agg_2': 'html',
                      'col-2-agg_3': 'CN',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'html',
                      'col-2-agg_3': 'FR',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                  ],
                },
                row: 2,
                column: 2,
                value: 'MX',
              },
            },
            {
              name: 'US',
              size: 8293,
              children: [],
              rawData: {
                table: {
                  columns: [
                    {
                      id: 'col-0-agg_2',
                      name: 'machine.os: Descending',
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
                  ],
                  rows: [
                    {
                      'col-0-agg_2': 'png',
                      'col-2-agg_3': 'IT',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'png',
                      'col-2-agg_3': 'US',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                    {
                      'col-0-agg_2': 'css',
                      'col-2-agg_3': 'MX',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'css',
                      'col-2-agg_3': 'US',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                    {
                      'col-0-agg_2': 'html',
                      'col-2-agg_3': 'CN',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'html',
                      'col-2-agg_3': 'FR',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                  ],
                },
                row: 3,
                column: 2,
                value: 'US',
              },
            },
          ],
          rawData: {
            table: {
              columns: [
                {
                  id: 'col-0-agg_2',
                  name: 'machine.os: Descending',
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
              ],
              rows: [
                {
                  'col-0-agg_2': 'png',
                  'col-2-agg_3': 'IT',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 9299,
                },
                {
                  'col-0-agg_2': 'png',
                  'col-2-agg_3': 'US',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 8293,
                },
                {
                  'col-0-agg_2': 'css',
                  'col-2-agg_3': 'MX',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 9299,
                },
                {
                  'col-0-agg_2': 'css',
                  'col-2-agg_3': 'US',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 8293,
                },
                {
                  'col-0-agg_2': 'html',
                  'col-2-agg_3': 'CN',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 9299,
                },
                {
                  'col-0-agg_2': 'html',
                  'col-2-agg_3': 'FR',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 8293,
                },
              ],
            },
            row: 2,
            column: 0,
            value: 'css',
          },
        },
        {
          name: 'html',
          size: 412032,
          children: [
            {
              name: 'CN',
              size: 9299,
              children: [],
              rawData: {
                table: {
                  columns: [
                    {
                      id: 'col-0-agg_2',
                      name: 'machine.os: Descending',
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
                  ],
                  rows: [
                    {
                      'col-0-agg_2': 'png',
                      'col-2-agg_3': 'IT',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'png',
                      'col-2-agg_3': 'US',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                    {
                      'col-0-agg_2': 'css',
                      'col-2-agg_3': 'MX',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'css',
                      'col-2-agg_3': 'US',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                    {
                      'col-0-agg_2': 'html',
                      'col-2-agg_3': 'CN',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'html',
                      'col-2-agg_3': 'FR',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                  ],
                },
                row: 4,
                column: 2,
                value: 'CN',
              },
            },
            {
              name: 'FR',
              size: 8293,
              children: [],
              rawData: {
                table: {
                  columns: [
                    {
                      id: 'col-0-agg_2',
                      name: 'machine.os: Descending',
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
                  ],
                  rows: [
                    {
                      'col-0-agg_2': 'png',
                      'col-2-agg_3': 'IT',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'png',
                      'col-2-agg_3': 'US',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                    {
                      'col-0-agg_2': 'css',
                      'col-2-agg_3': 'MX',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'css',
                      'col-2-agg_3': 'US',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                    {
                      'col-0-agg_2': 'html',
                      'col-2-agg_3': 'CN',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 9299,
                    },
                    {
                      'col-0-agg_2': 'html',
                      'col-2-agg_3': 'FR',
                      'col-1-agg_1': 412032,
                      'col-3-agg_1': 8293,
                    },
                  ],
                },
                row: 5,
                column: 2,
                value: 'FR',
              },
            },
          ],
          rawData: {
            table: {
              columns: [
                {
                  id: 'col-0-agg_2',
                  name: 'machine.os: Descending',
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
              ],
              rows: [
                {
                  'col-0-agg_2': 'png',
                  'col-2-agg_3': 'IT',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 9299,
                },
                {
                  'col-0-agg_2': 'png',
                  'col-2-agg_3': 'US',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 8293,
                },
                {
                  'col-0-agg_2': 'css',
                  'col-2-agg_3': 'MX',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 9299,
                },
                {
                  'col-0-agg_2': 'css',
                  'col-2-agg_3': 'US',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 8293,
                },
                {
                  'col-0-agg_2': 'html',
                  'col-2-agg_3': 'CN',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 9299,
                },
                {
                  'col-0-agg_2': 'html',
                  'col-2-agg_3': 'FR',
                  'col-1-agg_1': 412032,
                  'col-3-agg_1': 8293,
                },
              ],
            },
            row: 4,
            column: 0,
            value: 'html',
          },
        },
      ],
    },
  },
};
