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

import PropTypes from 'prop-types';
import React from 'react';
import moment from 'moment';
import {
  Axis,
  Chart,
  Position,
  Settings,
  getAxisId,
  getGroupId,
  DARK_THEME,
  LIGHT_THEME,
  getAnnotationId,
  AnnotationDomainTypes,
  LineAnnotation
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { Series } from './series';
import { GRID_LINE_CONFIG } from '../lib/config';
import { ICON_TYPES_MAP } from '../constants/icons';

function generateAnnotationData(values) {
  return values.map((value) => ({
    dataValue: value[0],
    details: value[1][0],
    header: moment(value[0]).format('MMM DD, YYYY hh:mm A')
  }));
}

export const TimeSeries = ({
  isDarkMode,
  showGrid,
  legend,
  legendPosition,
  xAxisLabel,
  series,
  yaxes,
  onBrush,
  xAxisFormatter,
  annotations
}) => {
  return (
    <Chart renderer="canvas" className="tvbVisTimeSeries" >
      <Settings
        showLegend={legend}
        legendPosition={legendPosition}
        onBrushEnd={onBrush}
        animateData={false}
        theme={isDarkMode ? DARK_THEME : LIGHT_THEME}
      />

      { annotations.map(({ id, series, icon, color }) => {
        const dataValues = generateAnnotationData(series);
        const style = { line: { stroke: color, } };

        return (
          <LineAnnotation
            key={id}
            annotationId={getAnnotationId(id)}
            domainType={AnnotationDomainTypes.XDomain}
            dataValues={dataValues}
            marker={<EuiIcon type={ICON_TYPES_MAP[icon]} />}
            style={style}
          />
        );})
      }

      { series.map(s => (
        <Series
          key={`${s.id}-${s.label}`}
          {...s}
        />))
      }

      { yaxes.map(({ id, groupId, position, tickFormatter, min, max }) => (
        <Axis
          key={id}
          groupId={getGroupId(groupId)}
          id={getAxisId(id)}
          position={position}
          domain={{ min, max }}
          showGridLines={showGrid}
          gridLineStyle={GRID_LINE_CONFIG}
          tickFormat={tickFormatter}
        />))
      }

      <Axis
        id={getAxisId('bottom')}
        position={Position.Bottom}
        title={xAxisLabel}
        tickFormat={xAxisFormatter}
        showGridLines={showGrid}
        gridLineStyle={GRID_LINE_CONFIG}
      />
    </Chart>
  );
};

TimeSeries.defaultProps = {
  showGrid: true,
  legend: true,
  legendPosition: 'right'
};

TimeSeries.propTypes = {
  isDarkMode: PropTypes.bool,
  showGrid: PropTypes.bool,
  legend: PropTypes.bool,
  legendPosition: PropTypes.string,
  xAxisLabel: PropTypes.string,
  series: PropTypes.array,
  yaxes: PropTypes.array,
  onBrush: PropTypes.func,
  xAxisFormatter: PropTypes.func,
  annotations: PropTypes.array,
};
