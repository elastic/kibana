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

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import {
  Axis,
  Chart,
  Position,
  Settings,
  DARK_THEME,
  LIGHT_THEME,
  AnnotationDomainTypes,
  LineAnnotation,
  TooltipType,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';

import { timezoneProvider } from 'ui/vis/lib/timezone';
import { eventBus, ACTIVE_CURSOR } from '../../lib/active_cursor';
import chrome from 'ui/chrome';
import { GRID_LINE_CONFIG, ICON_TYPES_MAP, STACKED_OPTIONS } from '../../constants';
import { AreaSeriesDecorator } from './decorators/area_decorator';
import { BarSeriesDecorator } from './decorators/bar_decorator';
import { getStackAccessors } from './utils/stack_format';

const generateAnnotationData = (values, formatter) =>
  values.map(({ key, docs }) => ({
    dataValue: key,
    details: docs[0],
    header: formatter({
      value: key,
    }),
  }));

const decorateFormatter = formatter => ({ value }) => formatter(value);

const handleCursorUpdate = cursor => {
  eventBus.trigger(ACTIVE_CURSOR, cursor);
};

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
  enableHistogramMode,
}) => {
  const chartRef = useRef();
  const updateCursor = (_, cursor) => {
    if (chartRef.current) {
      chartRef.current.dispatchExternalPointerEvent(cursor);
    }
  };

  useEffect(() => {
    eventBus.on(ACTIVE_CURSOR, updateCursor);

    return () => {
      eventBus.off(ACTIVE_CURSOR, undefined, updateCursor);
    };
  }, []); // eslint-disable-line

  const tooltipFormatter = decorateFormatter(xAxisFormatter);
  const uiSettings = chrome.getUiSettingsClient();
  const timeZone = timezoneProvider(uiSettings)();
  const hasBarChart = series.some(({ bars }) => bars.show);

  return (
    <Chart ref={chartRef} renderer="canvas" className="tvbVisTimeSeries">
      <Settings
        showLegend={legend}
        legendPosition={legendPosition}
        onBrushEnd={onBrush}
        animateData={false}
        onPointerUpdate={handleCursorUpdate}
        theme={
          hasBarChart
            ? {}
            : {
                crosshair: {
                  band: {
                    fill: '#F00',
                  },
                },
              }
        }
        baseTheme={isDarkMode ? DARK_THEME : LIGHT_THEME}
        tooltip={{
          snap: true,
          type: TooltipType.VerticalCursor,
          headerFormatter: tooltipFormatter,
        }}
      />

      {annotations.map(({ id, data, icon, color }) => {
        const dataValues = generateAnnotationData(data, tooltipFormatter);
        const style = { line: { stroke: color } };

        return (
          <LineAnnotation
            key={id}
            id={id}
            domainType={AnnotationDomainTypes.XDomain}
            dataValues={dataValues}
            marker={<EuiIcon type={ICON_TYPES_MAP[icon] || 'asterisk'} />}
            hideLinesTooltips={true}
            style={style}
          />
        );
      })}

      {series.map(
        (
          {
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
            useDefaultGroupDomain,
          },
          sortIndex
        ) => {
          const stackAccessors = getStackAccessors(stack);
          const isPercentage = stack === STACKED_OPTIONS.PERCENT;
          const key = `${id}-${label}`;

          if (bars.show) {
            return (
              <BarSeriesDecorator
                key={key}
                seriesId={id}
                seriesGroupId={groupId}
                name={label.toString()}
                data={data}
                hideInLegend={hideInLegend}
                bars={bars}
                color={color}
                stackAccessors={stackAccessors}
                stackAsPercentage={isPercentage}
                xScaleType={xScaleType}
                yScaleType={yScaleType}
                timeZone={timeZone}
                enableHistogramMode={enableHistogramMode}
                useDefaultGroupDomain={useDefaultGroupDomain}
                sortIndex={sortIndex}
              />
            );
          }

          if (lines.show) {
            return (
              <AreaSeriesDecorator
                key={key}
                seriesId={id}
                seriesGroupId={groupId}
                name={label.toString()}
                data={data}
                hideInLegend={hideInLegend}
                lines={lines}
                color={color}
                stackAccessors={stackAccessors}
                stackAsPercentage={isPercentage}
                points={points}
                xScaleType={xScaleType}
                yScaleType={yScaleType}
                timeZone={timeZone}
                enableHistogramMode={enableHistogramMode}
                useDefaultGroupDomain={useDefaultGroupDomain}
                sortIndex={sortIndex}
              />
            );
          }

          return null;
        }
      )}

      {yAxis.map(({ id, groupId, position, tickFormatter, domain, hide }) => (
        <Axis
          key={groupId}
          groupId={groupId}
          id={id}
          position={position}
          domain={domain}
          hide={hide}
          showGridLines={showGrid}
          gridLineStyle={GRID_LINE_CONFIG}
          tickFormat={tickFormatter}
        />
      ))}

      <Axis
        id="bottom"
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
  enableHistogramMode: PropTypes.bool.isRequired,
};
