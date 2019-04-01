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

/* eslint-disable camelcase */

export const pre_6_1 = {
  'title': 'metrics test',
  'type': 'metric',
  'params': {
    'addTooltip': true,
    'addLegend': true,
    'type': 'gauge',
    'gauge': {
      'verticalSplit': false,
      'autoExtend': false,
      'percentageMode': false,
      'gaugeType': 'Metric',
      'gaugeStyle': 'Full',
      'backStyle': 'Full',
      'orientation': 'vertical',
      'colorSchema': 'Green to Red',
      'gaugeColorMode': 'Labels',
      'useRange': false,
      'colorsRange': [
        {
          'from': 0,
          'to': 100
        }
      ],
      'invertColors': false,
      'labels': {
        'show': true,
        'color': 'black'
      },
      'scale': {
        'show': false,
        'labels': false,
        'color': '#333',
        'width': 2
      },
      'type': 'simple',
      'style': {
        'fontSize': 60,
        'bgColor': false,
        'labelColor': true,
        'subText': ''
      }
    }
  },
  'aggs': [
    {
      'id': '1',
      'enabled': true,
      'type': 'count',
      'schema': 'metric',
      'params': {}
    }
  ]
};

export const since_6_1 = {
  'title': 'metrics test',
  'type': 'metric',
  'params': {
    'addTooltip': true,
    'addLegend': false,
    'type': 'metric',
    'metric': {
      'percentageMode': false,
      'colorSchema': 'Green to Red',
      'metricColorMode': 'Labels',
      'useRange': false,
      'colorsRange': [
        {
          'from': 0,
          'to': 100
        }
      ],
      'invertColors': false,
      'labels': {
        'show': true,
        'color': 'black'
      },
      'style': {
        'fontSize': 60,
        'bgColor': false,
        'labelColor': true,
        'subText': ''
      }
    }
  },
  'aggs': [
    {
      'id': '1',
      'enabled': true,
      'type': 'count',
      'schema': 'metric',
      'params': {}
    }
  ]
};
