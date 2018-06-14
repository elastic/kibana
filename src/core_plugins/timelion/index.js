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

export default function (kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      app: {
        title: 'Timelion',
        order: -1000,
        description: 'Time series expressions for everything',
        icon: 'plugins/timelion/icon.svg',
        main: 'plugins/timelion/app',
      },
      hacks: [
        'plugins/timelion/lib/panel_registry',
        'plugins/timelion/panels/timechart/timechart'
      ],
      visTypes: [
        'plugins/timelion/vis'
      ],
      home: [
        'plugins/timelion/register_feature'
      ],
      mappings: require('./mappings.json'),

      uiSettingDefaults: {
        'timelion:showTutorial': {
          name: 'Show tutorial',
          value: false,
          description: `Should I show the tutorial by default when entering the timelion app?`,
          category: ['timelion'],
        },
        'timelion:es.timefield': {
          name: 'Time field',
          value: '@timestamp',
          description: `Default field containing a timestamp when using .es()`,
          category: ['timelion'],
        },
        'timelion:es.default_index': {
          name: 'Default index',
          value: '_all',
          description: `Default elasticsearch index to search with .es()`,
          category: ['timelion'],
        },
        'timelion:target_buckets': {
          name: 'Target buckets',
          value: 200,
          description: `The number of buckets to shoot for when using auto intervals`,
          category: ['timelion'],
        },
        'timelion:max_buckets': {
          name: 'Maximum buckets',
          value: 2000,
          description: `The maximum number of buckets a single datasource can return`,
          category: ['timelion'],
        },
        'timelion:default_columns': {
          name: 'Default columns',
          value: 2,
          description: `Number of columns on a timelion sheet by default`,
          category: ['timelion'],
        },
        'timelion:default_rows': {
          name: 'Default rows',
          value: 2,
          description: `Number of rows on a timelion sheet by default`,
          category: ['timelion'],
        },
        'timelion:min_interval': {
          name: 'Minimum interval',
          value: '1ms',
          description: `The smallest interval that will be calculated when using "auto"`,
          category: ['timelion'],
        },
        'timelion:graphite.url': {
          name: 'Graphite URL',
          value: 'https://www.hostedgraphite.com/UID/ACCESS_KEY/graphite',
          description: `<em>[experimental]</em> The URL of your graphite host`,
          category: ['timelion'],
        },
        'timelion:quandl.key': {
          name: 'Quandl key',
          value: 'someKeyHere',
          description: `<em>[experimental]</em> Your API key from www.quandl.com`,
          category: ['timelion'],
        }
      }
    },
    init: require('./init.js'),
  });
}
