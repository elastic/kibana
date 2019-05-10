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


export const fixtures = {
  doc: {
    attributes: {
      visState: JSON.stringify({
        title: 'Filter Bytes Test: tsvb metric with custom interval and bytes filter',
        type: 'metrics',
        params: {
          id: '61ca57f0-469d-11e7-af02-69e470af7417',
          type: 'metric',
          series: [
            {
              id: '1',
              color: '#68BC00',
              split_mode: 'everything',
              metrics: [
                {
                  value: '',
                  id: '61ca57f2-469d-11e7-af02-69e470af7417',
                  type: 'sum',
                  field: 'bytes'
                }
              ],
              filter: 'Filter Bytes Test:>1000',
            },
            {
              id: '2',
              color: '#68BC00',
              split_mode: 'everything',
              metrics: [
                {
                  value: '',
                  id: '61ca57f2-469d-11e7-af02-69e470af7417',
                  type: 'sum',
                  field: 'bytes'
                }
              ],
              filter: {
                query: 'Filter Bytes Test:>1000',
                language: 'lucene'
              },
            },
            {
              id: '3',
              color: '#68BC00',
              split_mode: 'everything',
              metrics: [
                {
                  value: '',
                  id: '61ca57f2-469d-11e7-af02-69e470af7417',
                  type: 'sum',
                  field: 'bytes'
                }
              ]
            }
          ],
          time_field: '@timestamp',
          index_pattern: 'logstash-*',
          interval: 'auto',
          axis_position: 'left',
          axis_formatter: 'number',
          show_legend: 1,
          show_grid: 1,
          background_color_rules: [{ 'id': '1' }]
        },
        aggs: []
      })
    },
  },
  doc2: {
    attributes: {
      visState: JSON.stringify({
        title: 'Arbitrary table',
        type: 'table',
        params: {
          id: '61ca57f0-469d-11e7-af02-69e470af7417',
          type: 'metric',
          series: [
            {
              id: '1',
              color: '#68BC00',
              split_mode: 'everything',
              metrics: [
                {
                  value: '',
                  id: '61ca57f2-469d-11e7-af02-69e470af7417',
                  type: 'sum',
                  field: 'bytes'
                }
              ],
              filter: '',
            }
          ],
          time_field: '@timestamp',
          index_pattern: 'logstash-*',
          interval: 'auto',
          axis_position: 'left',
          axis_formatter: 'number',
          show_legend: 1,
          show_grid: 1,
          background_color_rules: [{ 'id': '1' }]
        },
        aggs: []
      })
    },
  },
  doc3: {
    id: '3',
    type: 'visualization',
    attributes: {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{}'
      },
      title: 'Filter Bytes Test: tsvb markdown',
      uiStateJSON: '{}',
      version: 1,
      visState: JSON.stringify({
        title: 'Filter Bytes Test: tsvb markdown',
        type: 'metrics',
        params: {
          id: '61ca57f0-469d-11e7-af02-69e470af7417',
          type: 'markdown',
          series: [
            {
              id: '61ca57f1-469d-11e7-af02-69e470af7417',
              color: '#68BC00',
              split_mode: 'filters',
              metrics: [
                {
                  id: '482d6560-4194-11e8-a461-7d278185cba4',
                  type: 'avg',
                  field: 'bytes'
                }
              ],
              seperate_axis: 0,
              axis_position: 'right',
              formatter: 'number',
              chart_type: 'line',
              line_width: 1,
              point_size: 1,
              fill: 0.5,
              stacked: 'none',
              terms_field: 'clientip',
              filter: 'Filter Bytes Test:>1000',
              override_index_pattern: 0,
              series_index_pattern: 'logstash-*',
              series_time_field: 'utc_time',
              series_interval: '1m',
              value_template: '',
              split_filters: [
                {
                  filter: 'bytes:>1000',
                  label: '',
                  color: '#68BC00',
                  id: '39a107e0-4194-11e8-a461-7d278185cba4'
                }
              ],
              label: '',
              var_name: ''
            }
          ],
          time_field: '@timestamp',
          index_pattern: 'logstash-*',
          interval: 'auto',
          axis_position: 'left',
          axis_formatter: 'number',
          show_legend: 1,
          show_grid: 1,
          background_color_rules: [
            {
              id: '06893260-4194-11e8-a461-7d278185cba4'
            }
          ],
          bar_color_rules: [
            {
              id: '36a0e740-4194-11e8-a461-7d278185cba4'
            }
          ],
          markdown: '{{bytes_1000.last.formatted}}'
        }
      })
    }
  }
};
