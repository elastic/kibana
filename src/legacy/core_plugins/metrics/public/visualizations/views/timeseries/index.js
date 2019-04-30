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
import { AreaSeriesDecorator } from './decorators/area_decorator';
import { BarSeriesDecorator } from './decorators/bar_decorator';
import { GRID_LINE_CONFIG, ICON_TYPES_MAP } from '../../constants';

function generateAnnotationData(values) {
  return values.map(({ key, docs }) => ({
    dataValue: key,
    details: docs[0],
    header: moment(key).format('MMM DD, YYYY hh:mm A')
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

      { annotations.map(({ id, data, icon, color }) => {
        const dataValues = generateAnnotationData(data);
        const style = { line: { stroke: color, } };

        return (
          <LineAnnotation
            key={id}
            annotationId={getAnnotationId(id)}
            domainType={AnnotationDomainTypes.XDomain}
            dataValues={dataValues}
            marker={<EuiIcon type={ICON_TYPES_MAP[icon] || 'asterisk'} />}
            style={style}
          />
        );})
      }

      {
        series.map(({ id, label, bars, lines, data, hideInLegend, xScaleType, yScaleType, groupId, color, stack, points }) => {
          if (bars.show) {
            return (
              <BarSeriesDecorator
                key={`${id}-${label}`}
                seriesId={id}
                groupId={groupId}
                name={label}
                data={data}
                hideInLegend={hideInLegend}
                bars={bars}
                color={color}
                stack={stack}
                points={points}
                xScaleType={xScaleType}
                yScaleType={yScaleType}
              />
            );
          }

          if (lines.show) {
            return (
              <AreaSeriesDecorator
                key={`${id}-${label}`}
                seriesId={id}
                groupId={groupId}
                name={label}
                data={data}
                hideInLegend={hideInLegend}
                lines={lines}
                color={color}
                stack={stack}
                points={points}
                xScaleType={xScaleType}
                yScaleType={yScaleType}
              />
            );
          }

          return null;
        })
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
