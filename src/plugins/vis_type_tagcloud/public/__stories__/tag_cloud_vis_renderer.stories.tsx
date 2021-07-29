/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { PaletteDefinition, SeriesLayer } from '../../../charts/public';
import { getTagCloudVisRenderer } from '../tag_cloud_vis_renderer';
import { Render } from '../../../presentation_util/public/__stories__';
import { TagCloudVisRenderValue } from '../tag_cloud_fn';

export const getPaletteRegistry = () => {
  const mockPalette1: PaletteDefinition = {
    id: 'default',
    title: 'My Palette',
    getCategoricalColor: (_: SeriesLayer[]) => 'black',
    getCategoricalColors: (num: number) => ['red', 'black'],
    toExpression: () => ({
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'system_palette',
          arguments: {
            name: ['default'],
          },
        },
      ],
    }),
  };

  return {
    get: (name: string) =>
      name === 'custom' ? mockPalette1 : name !== 'default' ? mockPalette1 : mockPalette1,
    getAll: () => [mockPalette1],
  };
};

const palettes = {
  getPalettes: async () => getPaletteRegistry(),
};

const config: TagCloudVisRenderValue = {
  visType: 'tagcloud',
  visData: {
    type: 'datatable',
    rows: [
      { country: 'US', Count: 14 },
      { country: 'JP', Count: 13 },
      { country: 'UK', Count: 13 },
      { country: 'CN', Count: 8 },
      { country: 'TZ', Count: 14 },
      { country: 'NL', Count: 11 },
      { country: 'AZ', Count: 14 },
      { country: 'BR', Count: 11 },
      { country: 'DE', Count: 16 },
      { country: 'SA', Count: 11 },
      { country: 'RU', Count: 9 },
      { country: 'IN', Count: 9 },
      { country: 'PH', Count: 7 },
    ],
    columns: [
      { id: 'country', name: 'country', meta: { type: 'string' } },
      { id: 'Count', name: 'Count', meta: { type: 'number' } },
    ],
  },
  visParams: {
    scale: 'linear',
    orientation: 'single',
    minFontSize: 18,
    maxFontSize: 72,
    showLabel: true,
    metric: {
      type: 'vis_dimension',
      accessor: { id: 'Count', name: 'Count', meta: { type: 'number' } },
      format: { id: 'string', params: {} },
    },
    bucket: {
      type: 'vis_dimension',
      accessor: { id: 'country', name: 'country', meta: { type: 'string' } },
      format: { id: 'string', params: {} },
    },
    palette: { type: 'palette', name: 'default' },
  },
  syncColors: false,
};

storiesOf('renderers/tag_cloud_vis', module)
  .add('default', () => {
    return <Render renderer={() => getTagCloudVisRenderer({ palettes })} config={config} />;
  })
  .add('With empty result', () => {
    return (
      <Render
        renderer={() => getTagCloudVisRenderer({ palettes })}
        config={{ ...config, visData: { ...config.visData, rows: [] } }}
      />
    );
  });
