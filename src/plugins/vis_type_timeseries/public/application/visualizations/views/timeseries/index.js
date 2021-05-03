/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { labelDateFormatter } from '../../../components/lib/label_date_formatter';

import {
  Axis,
  Chart,
  Position,
  Settings,
  AnnotationDomainType,
  LineAnnotation,
  TooltipType,
  StackMode,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { getTimezone } from '../../../lib/get_timezone';
import { activeCursor$ } from '../../lib/active_cursor';
import { getUISettings, getChartsSetup } from '../../../../services';
import { GRID_LINE_CONFIG, ICON_TYPES_MAP, STACKED_OPTIONS } from '../../constants';
import { AreaSeriesDecorator } from './decorators/area_decorator';
import { BarSeriesDecorator } from './decorators/bar_decorator';
import { getStackAccessors } from './utils/stack_format';
import { getBaseTheme, getChartClasses } from './utils/theme';
import { emptyLabel } from '../../../../../common/empty_label';
import { getSplitByTermsColor } from '../../../lib/get_split_by_terms_color';
import { renderEndzoneTooltip } from '../../../../../../charts/public';
import { getAxisLabelString } from '../../../components/lib/get_axis_label_string';
import { calculateDomainForSeries } from './utils/series_domain_calculation';

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
  series,
  yAxis,
  onBrush,
  xAxisFormatter,
  annotations,
  syncColors,
  palettesService,
  interval,
  isLastBucketDropped,
}) => {
  const chartRef = useRef();
  // const [palettesRegistry, setPalettesRegistry] = useState(null);

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

  let tooltipFormatter = decorateFormatter(xAxisFormatter);
  if (!isLastBucketDropped) {
    const domainBounds = calculateDomainForSeries(series);
    tooltipFormatter = renderEndzoneTooltip(
      interval,
      domainBounds?.domainStart,
      domainBounds?.domainEnd,
      xAxisFormatter
    );
  }

  const uiSettings = getUISettings();
  const timeZone = getTimezone(uiSettings);
  const hasBarChart = series.some(({ bars }) => bars?.show);

  // apply legend style change if bgColor is configured
  const classes = classNames(getChartClasses(backgroundColor));

  // If the color isn't configured by the user, use the color mapping service
  // to assign a color from the Kibana palette. Colors will be shared across the
  // session, including dashboards.
  const { theme: themeService } = getChartsSetup();

  const baseTheme = getBaseTheme(themeService.useChartsBaseTheme(), backgroundColor);

  const onBrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const [min, max] = x;
    onBrush(min, max, series);
  };

  const getSeriesColor = useCallback(
    (seriesName, seriesGroupId, seriesId) => {
      const seriesById = series.filter((s) => s.seriesId === seriesGroupId);
      const props = {
        seriesById,
        seriesName,
        seriesId,
        baseColor: seriesById[0].baseColor,
        seriesPalette: seriesById[0].palette,
        palettesRegistry: palettesService,
        syncColors,
      };
      return getSplitByTermsColor(props) || null;
    },
    [palettesService, series, syncColors]
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
          boundary: document.getElementById('app-fixed-viewport') ?? undefined,
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
            domainType={AnnotationDomainType.XDomain}
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
          const splitColor = getSeriesColor(seriesName, seriesId, id);
          const finalColor = isSplitByTerms && splitColor ? splitColor : color;
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
        title={getAxisLabelString(interval)}
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
  series: PropTypes.array,
  yAxis: PropTypes.array,
  onBrush: PropTypes.func,
  xAxisFormatter: PropTypes.func,
  annotations: PropTypes.array,
  interval: PropTypes.number,
  isLastBucketDropped: PropTypes.bool,
};
