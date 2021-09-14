/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
