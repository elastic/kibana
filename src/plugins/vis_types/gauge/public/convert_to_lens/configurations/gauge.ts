/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { GaugeVisConfiguration } from '@kbn/visualizations-plugin/common';
import { GaugeVisParams } from '../../types';

export const getConfiguration = (
  layerId: string,
  params: GaugeVisParams,
  palette: PaletteOutput<CustomPaletteParams> | undefined,
  {
    metricAccessor,
    minAccessor,
    maxAccessor,
  }: {
    metricAccessor: string;
    minAccessor: string;
    maxAccessor: string;
  }
): GaugeVisConfiguration => {
  const showLabels = Boolean(params.gauge.labels.show);
  return {
    layerId,
    layerType: 'data',
    palette,
    metricAccessor,
    minAccessor,
    maxAccessor,
    shape: 'horizontalBullet',
    ticksPosition: 'bands',
    labelMajorMode: 'auto',
    colorMode: palette ? 'palette' : 'none',
    labelMinor: showLabels ? params.gauge.style.subText : undefined,
  };
};
