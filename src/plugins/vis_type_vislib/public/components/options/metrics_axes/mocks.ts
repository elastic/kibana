/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Vis } from '../../../../../visualizations/public';
import { Axis, ValueAxis, SeriesParam } from '../../../types';
import {
  ChartTypes,
  ChartModes,
  InterpolationModes,
  ScaleTypes,
  Positions,
  AxisTypes,
  getScaleTypes,
  getAxisModes,
  getPositions,
  getInterpolationModes,
} from '../../../utils/collections';
import { Style } from '../../../../../charts/public';

const defaultValueAxisId = 'ValueAxis-1';

const axis = {
  show: true,
  style: {} as Style,
  title: {
    text: '',
  },
  labels: {
    show: true,
    filter: true,
    truncate: 0,
    color: 'black',
  },
};

const categoryAxis: Axis = {
  ...axis,
  id: 'CategoryAxis-1',
  type: AxisTypes.CATEGORY,
  position: Positions.BOTTOM,
  scale: {
    type: ScaleTypes.LINEAR,
  },
};

const valueAxis: ValueAxis = {
  ...axis,
  id: defaultValueAxisId,
  name: 'ValueAxis-1',
  type: AxisTypes.VALUE,
  position: Positions.LEFT,
  scale: {
    type: ScaleTypes.LINEAR,
    boundsMargin: 1,
    defaultYExtents: true,
    min: 1,
    max: 2,
    setYExtents: true,
  },
};

const seriesParam: SeriesParam = {
  show: true,
  type: ChartTypes.HISTOGRAM,
  mode: ChartModes.STACKED,
  data: {
    label: 'Count',
    id: '1',
  },
  drawLinesBetweenPoints: true,
  lineWidth: 2,
  showCircles: true,
  interpolate: InterpolationModes.LINEAR,
  valueAxis: defaultValueAxisId,
};

const positions = getPositions();
const axisModes = getAxisModes();
const scaleTypes = getScaleTypes();
const interpolationModes = getInterpolationModes();

const vis = ({
  type: {
    editorConfig: {
      collections: { scaleTypes, axisModes, positions, interpolationModes },
    },
  },
} as any) as Vis;

export { defaultValueAxisId, categoryAxis, valueAxis, seriesParam, vis };
