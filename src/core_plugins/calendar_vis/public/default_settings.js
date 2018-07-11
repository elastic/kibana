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

import { AXIS_SCALE_TYPE } from './components/chart/axis/axis_scale';
import { VIS_CHART_TYPE } from './lib/';
import { GRID_STYLE } from './components/chart/grid/grid_config';

export const containerName = 'vislib-container calendar-vis-container';
export const chartCanvas = 'vislib-chart calendar-chart';
export const chartWrapperName = 'calendar-chart-wrapper';
export const legendName = 'visualize-legend calendar-vis-legend';
export const tooltipId = 'calendar-chart-tooltip';
export const tooltipName = 'calendar-tooltip-container';

export const defaultParams = {
  // default params setup for calendar visualization
  type: VIS_CHART_TYPE.HEATMAP_YEAR,
  handleNoResults: false,
  addTooltip: true,
  addLegend: true,
  enableHover: false,
  legendPosition: 'right',
  times: [],
  colorsNumber: 4,
  colorSchema: 'Greens',
  setColorRange: false,
  colorsRange: [],
  invertColors: false,
  percentageMode: false,
  categoryAxes: [{
    id: 'CategoryAxis-1',
    type: 'category',
    position: 'top',
    scale: {
      type: AXIS_SCALE_TYPE.MONTHS
    },
  }, {
    id: 'CategoryAxis-2',
    type: 'category',
    position: 'left',
    scale: {
      type: AXIS_SCALE_TYPE.WEEKS
    },
  }],
  valueAxes: [{
    show: false,
    id: 'ValueAxis-1',
    type: 'value',
    scale: {
      type: 'linear',
      defaultYExtents: false,
    },
    labels: {
      show: false,
      rotate: 0,
      overwriteColor: false,
      color: '#555',
    }
  }],
  grid: {
    style: GRID_STYLE.RECT,
    cellSize: 15,
    xOffset: 20,
    yOffset: 20
  }
};
