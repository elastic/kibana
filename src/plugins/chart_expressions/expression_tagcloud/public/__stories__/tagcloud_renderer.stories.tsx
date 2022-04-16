/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { Render } from '@kbn/presentation-util-plugin/public/__stories__';
import { tagcloudRenderer } from '../expression_renderers';
import { TagcloudRendererConfig } from '../../common/types';
import { ScaleOptions, Orientation } from '../../common/constants';
import { palettes } from '../__mocks__/palettes';
import { theme } from '../__mocks__/theme';

const config: TagcloudRendererConfig = {
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
    scale: ScaleOptions.LINEAR,
    orientation: Orientation.SINGLE,
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

const containerSize = {
  width: '700px',
  height: '700px',
};

storiesOf('renderers/tag_cloud_vis', module)
  .add('Default', () => {
    return (
      <Render
        renderer={() => tagcloudRenderer({ palettes, theme })}
        config={config}
        {...containerSize}
      />
    );
  })
  .add('With log scale', () => {
    return (
      <Render
        renderer={() => tagcloudRenderer({ palettes, theme })}
        config={{ ...config, visParams: { ...config.visParams, scale: ScaleOptions.LOG } }}
        {...containerSize}
      />
    );
  })
  .add('With square root scale', () => {
    return (
      <Render
        renderer={() => tagcloudRenderer({ palettes, theme })}
        config={{ ...config, visParams: { ...config.visParams, scale: ScaleOptions.SQUARE_ROOT } }}
        {...containerSize}
      />
    );
  })
  .add('With right angled orientation', () => {
    return (
      <Render
        renderer={() => tagcloudRenderer({ palettes, theme })}
        config={{
          ...config,
          visParams: { ...config.visParams, orientation: Orientation.RIGHT_ANGLED },
        }}
        {...containerSize}
      />
    );
  })
  .add('With multiple orientations', () => {
    return (
      <Render
        renderer={() => tagcloudRenderer({ palettes, theme })}
        config={{
          ...config,
          visParams: { ...config.visParams, orientation: Orientation.MULTIPLE },
        }}
        {...containerSize}
      />
    );
  })
  .add('With hidden label', () => {
    return (
      <Render
        renderer={() => tagcloudRenderer({ palettes, theme })}
        config={{ ...config, visParams: { ...config.visParams, showLabel: false } }}
        {...containerSize}
      />
    );
  })
  .add('With empty results', () => {
    return (
      <Render
        renderer={() => tagcloudRenderer({ palettes, theme })}
        config={{ ...config, visData: { ...config.visData, rows: [] } }}
        {...containerSize}
      />
    );
  });
