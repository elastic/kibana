/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';

import { Vis } from '@kbn/visualizations-plugin/public';
import { Style } from '@kbn/charts-plugin/public';

import {
  ValueAxis,
  SeriesParam,
  ChartMode,
  InterpolationMode,
  ScaleType,
  AxisType,
  CategoryAxis,
} from '../../../../types';
import { ChartType } from '../../../../../common';

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

const categoryAxis: CategoryAxis = {
  ...axis,
  id: 'CategoryAxis-1',
  type: AxisType.Category,
  position: Position.Bottom,
  scale: {
    type: ScaleType.Linear,
  },
};

const valueAxis: ValueAxis = {
  ...axis,
  id: defaultValueAxisId,
  name: 'ValueAxis-1',
  type: AxisType.Value,
  position: Position.Left,
  scale: {
    type: ScaleType.Linear,
    boundsMargin: 1,
    defaultYExtents: true,
    min: 1,
    max: 2,
    setYExtents: true,
  },
};

const seriesParam: SeriesParam = {
  show: true,
  type: ChartType.Histogram,
  mode: ChartMode.Stacked,
  data: {
    label: 'Count',
    id: '1',
  },
  drawLinesBetweenPoints: true,
  lineWidth: 2,
  showCircles: true,
  circlesRadius: 3,
  interpolate: InterpolationMode.Linear,
  valueAxis: defaultValueAxisId,
};

const vis = {
  type: {
    editorConfig: {},
  },
} as any as Vis;

export { defaultValueAxisId, categoryAxis, valueAxis, seriesParam, vis };
