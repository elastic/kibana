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
  LineAnnotation,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { GRID_LINE_CONFIG, ICON_TYPES_MAP, STACKED_OPTIONS } from '../../constants';
import { AreaSeriesDecorator } from './decorators/area_decorator';
import { BarSeriesDecorator } from './decorators/bar_decorator';
import { getStackAccessors } from './utils/stack_format';

const generateAnnotationData = (values, formatter) =>
  values.map(({ key, docs }) => ({
    dataValue: key,
    details: docs[0],
    header: formatter(key),
  }));

const decorateFormatter = formatter => ({ value }) => formatter(value);

export const TimeSeries = ({
  isDarkMode,
  showGrid,
  legend,
  legendPosition,
  xAxisLabel,
  series,
  yAxis,
  onBrush,
  xAxisFormatter,
  annotations,
}) => {
  const tooltipFormatter = decorateFormatter(xAxisFormatter);

  return (
    <Chart renderer="canvas" className="tvbVisTimeSeries">
      <Settings
        showLegend={legend}
        legendPosition={legendPosition}
        onBrushEnd={onBrush}
        animateData={false}
        theme={isDarkMode ? DARK_THEME : LIGHT_THEME}
        tooltip={{
          headerFormatter: tooltipFormatter,
        }}
      />

      {annotations.map(({ id, data, icon, color }) => {
        const dataValues = generateAnnotationData(data, tooltipFormatter);
        const style = { line: { stroke: color } };

        return (
          <LineAnnotation
            key={id}
            annotationId={getAnnotationId(id)}
            domainType={AnnotationDomainTypes.XDomain}
            dataValues={dataValues}
            marker={<EuiIcon type={ICON_TYPES_MAP[icon] || 'asterisk'} />}
            style={style}
          />
        );
      })}

      {series.map(
        ({
          id,
          label,
          bars,
          lines,
          data,
          hideInLegend,
          xScaleType,
          yScaleType,
          groupId,
          color,
          stack,
          points,
        }) => {
          const stackAccessors = getStackAccessors(stack);
          const isPercentage = stack === STACKED_OPTIONS.PERCENT;

          if (bars.show) {
            return (
              <BarSeriesDecorator
                key={`${id}-${label}`}
                seriesId={id}
                seriesGroupId={groupId}
                name={label}
                data={data}
                hideInLegend={hideInLegend}
                bars={bars}
                color={color}
                stackAccessors={stackAccessors}
                stackAsPercentage={isPercentage}
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
                seriesGroupId={groupId}
                name={label}
                data={data}
                hideInLegend={hideInLegend}
                lines={lines}
                color={color}
                stackAccessors={stackAccessors}
                stackAsPercentage={isPercentage}
                points={points}
                xScaleType={xScaleType}
                yScaleType={yScaleType}
              />
            );
          }

          return null;
        }
      )}

      {yAxis.map(({ id, groupId, position, tickFormatter, min, max }) => (
        <Axis
          key={groupId}
          groupId={getGroupId(groupId)}
          id={getAxisId(id)}
          position={position}
          domain={{ min, max }}
          showGridLines={showGrid}
          gridLineStyle={GRID_LINE_CONFIG}
          tickFormat={tickFormatter}
        />
      ))}

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
  legendPosition: 'right',
};

TimeSeries.propTypes = {
  isDarkMode: PropTypes.bool,
  showGrid: PropTypes.bool,
  legend: PropTypes.bool,
  legendPosition: PropTypes.string,
  xAxisLabel: PropTypes.string,
  series: PropTypes.array,
  yAxis: PropTypes.array,
  onBrush: PropTypes.func,
  xAxisFormatter: PropTypes.func,
  annotations: PropTypes.array,
};
