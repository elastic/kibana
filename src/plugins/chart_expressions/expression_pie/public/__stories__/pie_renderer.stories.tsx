/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { Datatable } from '../../../../expressions';
import { Render } from '../../../../presentation_util/public/__stories__';
import { getPieVisRenderer } from '../expression_renderers';
import { LabelPositions, RenderValue, ValueFormats } from '../../common/types';
import { palettes, theme, getStartDeps } from '../__mocks__';

const visData: Datatable = {
  type: 'datatable',
  columns: [
    { id: 'cost', name: 'cost', meta: { type: 'number' } },
    { id: 'age', name: 'age', meta: { type: 'number' } },
    { id: 'price', name: 'price', meta: { type: 'number' } },
    { id: 'project', name: 'project', meta: { type: 'string' } },
    { id: '@timestamp', name: '@timestamp', meta: { type: 'date' } },
  ],
  rows: [
    {
      cost: 32.15,
      age: 63,
      price: 53,
      project: 'elasticsearch',
      '@timestamp': 1546334211208,
    },
    {
      cost: 20.52,
      age: 68,
      price: 33,
      project: 'beats',
      '@timestamp': 1546351551031,
    },
    {
      cost: 21.15,
      age: 57,
      price: 59,
      project: 'apm',
      '@timestamp': 1546352631083,
    },
    {
      cost: 35.64,
      age: 73,
      price: 71,
      project: 'machine-learning',
      '@timestamp': 1546402490956,
    },
    {
      cost: 27.19,
      age: 38,
      price: 36,
      project: 'kibana',
      '@timestamp': 1546467111351,
    },
  ],
};

const config: RenderValue = {
  visType: 'pie_vis',
  visData,
  visConfig: {
    dimensions: {
      metric: {
        type: 'vis_dimension',
        accessor: { id: 'cost', name: 'cost', meta: { type: 'number' } },
        format: { id: 'number', params: {} },
      },
      buckets: [
        {
          type: 'vis_dimension',
          accessor: { id: 'age', name: 'age', meta: { type: 'number' } },
          format: { id: 'number', params: {} },
        },
      ],
    },
    palette: { type: 'system_palette', name: 'default' },
    addTooltip: false,
    addLegend: false,
    legendPosition: 'right',
    nestedLegend: false,
    truncateLegend: false,
    distinctColors: false,
    isDonut: false,
    emptySizeRatio: 0.37,
    maxLegendLines: 1,
    labels: {
      show: false,
      last_level: false,
      position: LabelPositions.DEFAULT,
      values: false,
      truncate: null,
      valuesFormat: ValueFormats.VALUE,
      percentDecimals: 1,
    },
  },
  syncColors: false,
};

const containerSize = {
  width: '700px',
  height: '700px',
};

const pieRenderer = getPieVisRenderer({ palettes, theme, getStartDeps });

storiesOf('renderers/pieVis', module).add('Default', () => {
  return <Render renderer={() => pieRenderer} config={config} {...containerSize} />;
});
