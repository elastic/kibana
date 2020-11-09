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

import { VisualizeAppState } from '../types';

export const visualizeAppStateStub: VisualizeAppState = {
  uiState: {
    vis: {
      defaultColors: {
        '0 - 2': 'rgb(165,0,38)',
        '2 - 3': 'rgb(255,255,190)',
        '3 - 4': 'rgb(0,104,55)',
      },
    },
  },
  query: { query: '', language: 'kuery' },
  filters: [],
  vis: {
    title: '[eCommerce] Average Sold Quantity',
    type: 'gauge',
    aggs: [
      {
        id: '1',
        enabled: true,
        // @ts-expect-error
        type: 'avg',
        schema: 'metric',
        params: { field: 'total_quantity', customLabel: 'average items' },
      },
    ],
    params: {
      type: 'gauge',
      addTooltip: true,
      addLegend: true,
      isDisplayWarning: false,
      gauge: {
        extendRange: true,
        percentageMode: false,
        gaugeType: 'Circle',
        gaugeStyle: 'Full',
        backStyle: 'Full',
        orientation: 'vertical',
        colorSchema: 'Green to Red',
        gaugeColorMode: 'Labels',
        colorsRange: [
          { from: 0, to: 2 },
          { from: 2, to: 3 },
          { from: 3, to: 4 },
        ],
        invertColors: true,
        labels: { show: true, color: 'black' },
        scale: { show: false, labels: false, color: '#333' },
        type: 'meter',
        style: {
          bgWidth: 0.9,
          width: 0.9,
          mask: false,
          bgMask: false,
          maskBars: 50,
          bgFill: '#eee',
          bgColor: false,
          subText: 'per order',
          fontSize: 60,
          labelColor: true,
        },
        minAngle: 0,
        maxAngle: 6.283185307179586,
        alignment: 'horizontal',
      },
    },
  },
  linked: false,
};
