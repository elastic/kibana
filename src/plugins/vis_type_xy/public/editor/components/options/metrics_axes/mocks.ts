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

import { Position } from '@elastic/charts';

import { Vis } from '../../../../../../visualizations/public';
import { Style } from '../../../../../../charts/public';

import {
  ValueAxis,
  SeriesParam,
  ChartMode,
  InterpolationMode,
  ScaleType,
  AxisType,
  CategoryAxis,
} from '../../../../types';
import {
  getScaleTypes,
  getAxisModes,
  getPositions,
  getInterpolationModes,
} from '../../../collections';
import { ChartType } from '../../../../../common/types';

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
  interpolate: InterpolationMode.Linear,
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
