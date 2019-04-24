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

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import {
  getSpecId,
  getGroupId,
  ScaleType,
  CurveType,
  AreaSeries,
  BarSeries,
} from '@elastic/charts';

const isBarSeries = props => get(props, 'bars.show', false);
const getComponent = isBar => isBar ? BarSeries : AreaSeries;
const getFillStyles = (isBar, props) => isBarSeries(props) ? props.bars : props.lines;

const calculateCustomSeriesColors = (color, specId) => {
  const map = new Map();

  map.set(
    {
      specId,
      colorValues: [],
    },
    color,
  );

  return map;
};

const calculateLineSeriesStyles = (isBar, fillStyles, color) => {
  return {
    [isBar ? 'barSeriesStyle' : 'areaSeriesStyle']: {
      line: {
        stroke: '',
        strokeWidth: fillStyles.lineWidth || 0,
        visible: Boolean(fillStyles.lineWidth),
      },
      area: {
        fill: color,
        opacity: fillStyles.fill,
        visible: true,
      },
      border: {
        stroke: '',
        strokeWidth: 1,
        visible: false,
      },
      point: {
        visible: true,
        radius: 0.5,
        opacity: 0.1,
        stroke: '',
        strokeWidth: 0.5,
      },
    },
  };
};

export const Series = (props) => {
  const id = getSpecId(props.label + props.id);
  const isBar = isBarSeries(props);
  const Component = getComponent(isBar);
  const fillStyles = getFillStyles(isBar, props);

  const seriesSettings = {
    id,
    name: props.label,
    groupId: getGroupId(props.groupId),
    xScaleType: props.xScaleType,
    yScaleType: props.yScaleType,
    xAccessor: 0,
    yAccessors: [1],
    // todo: props.stack ???
    stackAccessors: props.stack ? [0] : null,
    data: props.data,
    yScaleToDataExtent: false,
    curve: fillStyles.steps ? CurveType.CURVE_STEP : CurveType.LINEAR,
    hideInLegend: props.hideInLegend,
    customSeriesColors: calculateCustomSeriesColors(props.color, id),
    ...calculateLineSeriesStyles(isBar, fillStyles, props.color),
  };

  return (
    <Component {...seriesSettings} />
  );
};

Series.propTypes = {
  hideInLegend: PropTypes.bool,
  id: PropTypes.string,
  xScaleType: PropTypes.string,
  yScaleType: PropTypes.string,
  groupId: PropTypes.string,
  label: PropTypes.node,
  data: PropTypes.array,
  bars: PropTypes.object,
  lines: PropTypes.object,
  color: PropTypes.string,
};

Series.defaultProps = {
  yScaleType: ScaleType.Linear,
  xScaleType: ScaleType.Time,
  bars: {},
  lines: {},
  hideInLegend: false,
};
