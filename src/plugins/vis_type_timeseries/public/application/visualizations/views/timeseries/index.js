/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { labelDateFormatter } from '../../../components/lib/label_date_formatter';

import {
  Axis,
  Chart,
  Position,
  Settings,
  AnnotationDomainTypes,
  LineAnnotation,
  TooltipType,
  StackMode,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { getTimezone } from '../../../lib/get_timezone';
import { activeCursor$ } from '../../lib/active_cursor';
import { computeGradientFinalColor } from '../../../lib/compute_gradient_final_color';
import { getUISettings, getChartsSetup } from '../../../../services';
import { GRID_LINE_CONFIG, ICON_TYPES_MAP, STACKED_OPTIONS } from '../../constants';
import { AreaSeriesDecorator } from './decorators/area_decorator';
import { BarSeriesDecorator } from './decorators/bar_decorator';
import { getStackAccessors } from './utils/stack_format';
import { getBaseTheme, getChartClasses } from './utils/theme';
import { emptyLabel } from '../../../../../common/empty_label';
import { PALETTES } from '../../../../../common/types';

const generateAnnotationData = (values, formatter) =>
  values.map(({ key, docs }) => ({
    dataValue: key,
    details: docs[0],
    header: formatter({
      value: key,
    }),
  }));

const decorateFormatter = (formatter) => ({ value }) => formatter(value);

const handleCursorUpdate = (cursor) => {
  activeCursor$.next(cursor);
};

export const TimeSeries = ({
  backgroundColor,
  showGrid,
  legend,
  legendPosition,
  tooltipMode,
  xAxisLabel,
  series,
  yAxis,
  onBrush,
  xAxisFormatter,
  annotations,
  syncColors,
}) => {
  const chartRef = useRef();
  const [palettesRegistry, setPalettesRegistry] = useState(null);

  useEffect(() => {
    const updateCursor = (cursor) => {
      if (chartRef.current) {
        chartRef.current.dispatchExternalPointerEvent(cursor);
      }
    };

    const subscription = activeCursor$.subscribe(updateCursor);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const tooltipFormatter = decorateFormatter(xAxisFormatter);
  const uiSettings = getUISettings();
  const timeZone = getTimezone(uiSettings);
  const hasBarChart = series.some(({ bars }) => bars?.show);

  // apply legend style change if bgColor is configured
  const classes = classNames('tvbVisTimeSeries', getChartClasses(backgroundColor));

  // If the color isn't configured by the user, use the color mapping service
  // to assign a color from the Kibana palette. Colors will be shared across the
  // session, including dashboards.
  const { theme: themeService, palettes } = getChartsSetup();

  useEffect(() => {
    const fetchPalettes = async () => {
      const palettesService = await palettes.getPalettes();
      setPalettesRegistry(palettesService);
    };
    fetchPalettes();
  }, [palettes]);

  const baseTheme = getBaseTheme(themeService.useChartsBaseTheme(), backgroundColor);

  const onBrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const [min, max] = x;
    onBrush(min, max);
  };

  const getSeriesColor = useCallback(
    (seriesName, seriesGroupId, seriesId) => {
      if (!seriesName) {
        return null;
      }

      const seriesById = series.filter((s) => s.seriesId === seriesGroupId);
      const paletteName =
        seriesById[0].palette.name === PALETTES.RAINBOW ||
        seriesById[0].palette.name === PALETTES.GRADIENT
          ? 'custom'
          : seriesById[0].palette.name;

      const gradientFinalColor = computeGradientFinalColor(
        seriesById[0].baseColor,
        seriesById.length
      );
      const paletteParams =
        seriesById[0].palette.name === PALETTES.GRADIENT
          ? {
              ...seriesById[0].palette.params,
              colors: [seriesById[0].baseColor, gradientFinalColor],
            }
          : seriesById[0].palette.params;

      const outputColor = palettesRegistry?.get(paletteName).getColor(
        [
          {
            name: seriesName,
            rankAtDepth: seriesById.findIndex(({ id }) => id === seriesId),
            totalSeriesAtDepth: seriesById.length,
          },
        ],
        {
          maxDepth: 1,
          totalSeries: seriesById.length,
          behindText: false,
          syncColors,
        },
        paletteParams
      );
      return outputColor || null;
    },
    [palettesRegistry, series, syncColors]
  );

  return (
    <Chart ref={chartRef} renderer="canvas" className={classes}>
      <Settings
        showLegend={legend}
        showLegendExtra={true}
        legendPosition={legendPosition}
        onBrushEnd={onBrushEndListener}
        animateData={false}
        onPointerUpdate={handleCursorUpdate}
        theme={[
          hasBarChart
            ? {}
            : {
                crosshair: {
                  band: {
                    fill: '#F00',
                  },
                },
              },
          {
            background: {
              color: backgroundColor,
            },
          },
        ]}
        baseTheme={baseTheme}
        tooltip={{
          snap: true,
          type: tooltipMode === 'show_focused' ? TooltipType.Follow : TooltipType.VerticalCursor,
          headerFormatter: tooltipFormatter,
        }}
        externalPointerEvents={{ tooltip: { visible: false } }}
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
            seriesId,
            label,
            labelFormatted,
            bars,
            lines,
            data,
            hideInLegend,
            xScaleType,
            yScaleType,
            groupId,
            color,
            isSplitByTerms,
            stack,
            points,
            y1AccessorFormat,
            y0AccessorFormat,
            tickFormat,
          },
          sortIndex
        ) => {
          const stackAccessors = getStackAccessors(stack);
          const isPercentage = stack === STACKED_OPTIONS.PERCENT;
          const isStacked = stack !== STACKED_OPTIONS.NONE;
          const key = `${id}-${label}`;
          let seriesName = label.toString();
          if (labelFormatted) {
            seriesName = labelDateFormatter(labelFormatted);
          }
          // The colors from the paletteService should be applied only when the timeseries is split by terms
          const finalColor = isSplitByTerms ? getSeriesColor(seriesName, seriesId, id) : color;
          if (bars?.show) {
            return (
              <BarSeriesDecorator
                key={key}
                seriesId={id}
                seriesGroupId={groupId}
                name={seriesName || emptyLabel}
                data={data}
                hideInLegend={hideInLegend}
                bars={bars}
                color={finalColor}
                stackAccessors={stackAccessors}
                stackMode={isPercentage ? StackMode.Percentage : undefined}
                xScaleType={xScaleType}
                yScaleType={yScaleType}
                timeZone={timeZone}
                enableHistogramMode={isStacked}
                sortIndex={sortIndex}
                y1AccessorFormat={y1AccessorFormat}
                y0AccessorFormat={y0AccessorFormat}
                tickFormat={tickFormat}
              />
            );
          }

          if (lines?.show) {
            return (
              <AreaSeriesDecorator
                key={key}
                seriesId={id}
                seriesGroupId={groupId}
                name={seriesName || emptyLabel}
                data={data}
                hideInLegend={hideInLegend}
                lines={lines}
                color={finalColor}
                stackAccessors={stackAccessors}
                stackMode={isPercentage ? StackMode.Percentage : undefined}
                points={points}
                xScaleType={xScaleType}
                yScaleType={yScaleType}
                timeZone={timeZone}
                enableHistogramMode={isStacked}
                sortIndex={sortIndex}
                y1AccessorFormat={y1AccessorFormat}
                y0AccessorFormat={y0AccessorFormat}
                tickFormat={tickFormat}
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
          gridLine={{
            ...GRID_LINE_CONFIG,
            visible: showGrid,
          }}
          tickFormat={tickFormatter}
        />
      ))}

      <Axis
        id="bottom"
        position={Position.Bottom}
        title={xAxisLabel}
        tickFormat={xAxisFormatter}
        gridLine={{
          ...GRID_LINE_CONFIG,
          visible: showGrid,
        }}
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
  backgroundColor: PropTypes.string,
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
