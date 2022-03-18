/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { memo, FC, useMemo, useState, useCallback } from 'react';
import {
  Chart,
  ElementClickListener,
  BrushEndListener,
  Heatmap,
  HeatmapBrushEvent,
  HeatmapElementEvent,
  HeatmapSpec,
  ScaleType,
  Settings,
  TooltipType,
  TooltipProps,
  ESFixedIntervalUnit,
  ESCalendarIntervalUnit,
  PartialTheme,
} from '@elastic/charts';
import type { CustomPaletteState } from '../../../../charts/public';
import { search } from '../../../../data/public';
import { LegendToggle, EmptyPlaceholder } from '../../../../charts/public';
import {
  getAccessorByDimension,
  getFormatByAccessor,
} from '../../../../visualizations/common/utils';
import type { HeatmapRenderProps, FilterEvent, BrushEvent } from '../../common';
import { applyPaletteParams, findMinMaxByColumnId, getSortPredicate } from './helpers';
import {
  LegendColorPickerWrapperContext,
  LegendColorPickerWrapper,
} from '../utils/get_color_picker';
import { DEFAULT_PALETTE_NAME, defaultPaletteParams } from '../constants';
import { HeatmapIcon } from './heatmap_icon';
import './index.scss';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

function getStops(
  { colors, stops, range }: CustomPaletteState,
  { min, max }: { min: number; max: number }
) {
  if (stops.length) {
    return stops.slice(0, stops.length - 1);
  }
  // Do not use relative values here
  const maxValue = range === 'percent' ? 100 : max;
  const minValue = range === 'percent' ? 0 : min;
  const step = (maxValue - minValue) / colors.length;
  return colors.slice(0, colors.length - 1).map((_, i) => minValue + (i + 1) * step);
}

/**
 * Heatmaps use a different convention than palettes (same convention as EuiColorStops)
 * so stops need to be left shifted.
 * Values normalization provides a percent => absolute array of values
 */
function shiftAndNormalizeStops(
  params: CustomPaletteState,
  { min, max }: { min: number; max: number }
) {
  // data min is the fallback in case of default options
  const absMin = params.range === 'percent' ? 0 : min;
  return [params.stops.length ? params.rangeMin : absMin, ...getStops(params, { min, max })].map(
    (value) => {
      let result = value;
      if (params.range === 'percent') {
        result = min + ((max - min) * value) / 100;
      }
      // for a range of 1 value the formulas above will divide by 0, so here's a safety guard
      if (Number.isNaN(result)) {
        return 1;
      }
      return Number(result.toFixed(2));
    }
  );
}

function computeColorRanges(
  paletteService: HeatmapRenderProps['paletteService'],
  paletteParams: CustomPaletteState | undefined,
  baseColor: string,
  minMax: { min: number; max: number }
) {
  const paletteColors =
    paletteParams?.colors ||
    applyPaletteParams(paletteService, { type: 'palette', name: DEFAULT_PALETTE_NAME }, minMax).map(
      ({ color }) => color
    );
  // Repeat the first color at the beginning to cover below and above the defined palette
  const colors = [paletteColors[0], ...paletteColors];

  const ranges = shiftAndNormalizeStops(
    {
      gradient: false,
      range: defaultPaletteParams.rangeType,
      rangeMin: defaultPaletteParams.rangeMin,
      rangeMax: defaultPaletteParams.rangeMax,
      stops: [],
      ...paletteParams,
      colors: colors.slice(1),
    },
    minMax
  );

  return { colors, ranges };
}

export const HeatmapComponent: FC<HeatmapRenderProps> = memo(
  ({
    data,
    args,
    timeZone,
    formatFactory,
    chartsThemeService,
    onClickValue,
    onSelectRange,
    paletteService,
    uiState,
    interactive,
  }) => {
    const chartTheme = chartsThemeService.useChartsTheme();
    const isDarkTheme = chartsThemeService.useDarkMode();
    // legacy heatmap legend is handled by the uiState
    const [showLegend, setShowLegend] = useState<boolean>(() => {
      const bwcLegendStateDefault = args.legend.isVisible ?? true;
      return uiState?.get('vis.legendOpen', bwcLegendStateDefault);
    });

    const toggleLegend = useCallback(() => {
      if (!interactive) {
        return;
      }
      setShowLegend((value) => {
        const newValue = !value;
        uiState?.set?.('vis.legendOpen', newValue);
        return newValue;
      });
    }, [uiState, interactive]);

    const setColor = useCallback(
      (newColor: string | null, seriesLabel: string | number) => {
        const colors = uiState?.get('vis.colors') || {};
        if (colors[seriesLabel] === newColor || !newColor) {
          delete colors[seriesLabel];
        } else {
          colors[seriesLabel] = newColor;
        }
        uiState?.setSilent('vis.colors', null);
        uiState?.set('vis.colors', colors);
        uiState?.emit('reload');
        uiState?.emit('colorChanged');
      },
      [uiState]
    );

    const table = data;
    const valueAccessor = args.valueAccessor
      ? getAccessorByDimension(args.valueAccessor, table.columns)
      : undefined;
    const minMaxByColumnId = useMemo(
      () => findMinMaxByColumnId([valueAccessor!], table),
      [valueAccessor, table]
    );

    const paletteParams = args.palette?.params;
    const xAccessor = args.xAccessor
      ? getAccessorByDimension(args.xAccessor, table.columns)
      : undefined;
    const yAccessor = args.yAccessor
      ? getAccessorByDimension(args.yAccessor, table.columns)
      : undefined;

    const xAxisColumnIndex = table.columns.findIndex((v) => v.id === xAccessor);
    const yAxisColumnIndex = table.columns.findIndex((v) => v.id === yAccessor);

    const xAxisColumn = table.columns[xAxisColumnIndex];
    const yAxisColumn = table.columns[yAxisColumnIndex];
    const valueColumn = table.columns.find((v) => v.id === valueAccessor);
    const xAxisMeta = xAxisColumn?.meta;
    const isTimeBasedSwimLane = xAxisMeta?.type === 'date';

    const onElementClick = useCallback(
      (e: HeatmapElementEvent[]) => {
        const cell = e[0][0];
        const { x, y } = cell.datum;

        const points = [
          {
            row: table.rows.findIndex((r) => r[xAxisColumn.id] === x),
            column: xAxisColumnIndex,
            value: x,
          },
          ...(yAxisColumn
            ? [
                {
                  row: table.rows.findIndex((r) => r[yAxisColumn.id] === y),
                  column: yAxisColumnIndex,
                  value: y,
                },
              ]
            : []),
        ];

        const context: FilterEvent['data'] = {
          data: points.map((point) => ({
            row: point.row,
            column: point.column,
            value: point.value,
            table,
          })),
        };
        onClickValue(context);
      },
      [onClickValue, table, xAxisColumn?.id, xAxisColumnIndex, yAxisColumn, yAxisColumnIndex]
    );

    const onBrushEnd = useCallback(
      (e: HeatmapBrushEvent) => {
        const { x, y } = e;

        if (isTimeBasedSwimLane) {
          const context: BrushEvent['data'] = {
            range: x as number[],
            table,
            column: xAxisColumnIndex,
          };
          onSelectRange(context);
        } else {
          const points: Array<{ row: number; column: number; value: string | number }> = [];

          if (yAxisColumn) {
            (y as string[]).forEach((v) => {
              points.push({
                row: table.rows.findIndex((r) => r[yAxisColumn.id] === v),
                column: yAxisColumnIndex,
                value: v,
              });
            });
          }
          if (xAxisColumn) {
            (x as string[]).forEach((v) => {
              points.push({
                row: table.rows.findIndex((r) => r[xAxisColumn.id] === v),
                column: xAxisColumnIndex,
                value: v,
              });
            });
          }

          const context: FilterEvent['data'] = {
            data: points.map((point) => ({
              row: point.row,
              column: point.column,
              value: point.value,
              table,
            })),
          };
          onClickValue(context);
        }
      },
      [
        isTimeBasedSwimLane,
        onClickValue,
        onSelectRange,
        table,
        xAxisColumn,
        xAxisColumnIndex,
        yAxisColumn,
        yAxisColumnIndex,
      ]
    );

    if (!valueColumn) {
      // Chart is not ready
      return null;
    }

    let chartData = table.rows.filter(
      (v) => v[valueAccessor!] === null || typeof v[valueAccessor!] === 'number'
    );
    if (!chartData || !chartData.length) {
      return <EmptyPlaceholder icon={HeatmapIcon} />;
    }

    if (!yAxisColumn) {
      // required for tooltip
      chartData = chartData.map((row) => {
        return {
          ...row,
          unifiedY: '',
        };
      });
    }
    const { min, max } = minMaxByColumnId[valueAccessor!];
    // formatters
    const xValuesFormatter = formatFactory(xAxisMeta?.params);
    const metricFormatter = formatFactory(getFormatByAccessor(args.valueAccessor!, table.columns));
    const dateHistogramMeta = xAxisColumn
      ? search.aggs.getDateHistogramMetaDataByDatatableColumn(xAxisColumn)
      : undefined;

    // Fallback to the ordinal scale type when a single row of data is provided.
    // Related issue https://github.com/elastic/elastic-charts/issues/1184
    let xScale: HeatmapSpec['xScale'] = { type: ScaleType.Ordinal };
    if (isTimeBasedSwimLane && chartData.length > 1) {
      const dateInterval = dateHistogramMeta?.interval;
      const esInterval = dateInterval ? search.aggs.parseEsInterval(dateInterval) : undefined;
      if (esInterval) {
        xScale = {
          type: ScaleType.Time,
          interval:
            esInterval.type === 'fixed'
              ? {
                  type: 'fixed',
                  unit: esInterval.unit as ESFixedIntervalUnit,
                  value: esInterval.value,
                }
              : {
                  type: 'calendar',
                  unit: esInterval.unit as ESCalendarIntervalUnit,
                  value: esInterval.value,
                },
        };
      }
    }

    const tooltip: TooltipProps = {
      type: args.showTooltip ? TooltipType.Follow : TooltipType.None,
    };

    const valueFormatter = (d: number) => {
      let value = d;

      if (args.percentageMode) {
        const percentageNumber = (Math.abs(value - min) / (max - min)) * 100;
        value = parseInt(percentageNumber.toString(), 10) / 100;
      }
      return `${metricFormatter.convert(value) ?? ''}`;
    };

    const { colors, ranges } = computeColorRanges(
      paletteService,
      paletteParams,
      isDarkTheme ? '#000' : '#fff',
      minMaxByColumnId[valueAccessor!]
    );

    // adds a very small number to the max value to make sure the max value will be included
    const smattering = 0.00001;
    let endValueDistinctBounds = max + smattering;
    if (paletteParams?.rangeMax || paletteParams?.rangeMax === 0) {
      endValueDistinctBounds =
        (paletteParams?.range === 'number'
          ? paletteParams.rangeMax
          : min + ((max - min) * paletteParams.rangeMax) / 100) + smattering;
    }

    const overwriteColors = uiState?.get('vis.colors') ?? null;
    const hasSingleValue = max === min;
    const bands = ranges.map((start, index, array) => {
      const isPenultimate = index === array.length - 1;
      const nextValue = array[index + 1];
      // by default the last range is right-open
      let endValue = isPenultimate ? Number.POSITIVE_INFINITY : nextValue;
      const startValue = isPenultimate && hasSingleValue ? min : start;
      // if the lastRangeIsRightOpen is set to false, we need to set the last range to the max value
      if (args.lastRangeIsRightOpen === false) {
        const lastBand = hasSingleValue ? Number.POSITIVE_INFINITY : endValueDistinctBounds;
        endValue = isPenultimate ? lastBand : nextValue;
      }

      let overwriteArrayIdx;

      if (endValue === Number.POSITIVE_INFINITY) {
        overwriteArrayIdx = `≥ ${metricFormatter.convert(startValue)}`;
      } else {
        overwriteArrayIdx = `${metricFormatter.convert(start)} - ${metricFormatter.convert(
          endValue
        )}`;
      }

      const overwriteColor = overwriteColors?.[overwriteArrayIdx];
      return {
        // with the default continuity:above the every range is left-closed
        start: startValue,
        end: endValue,
        // the current colors array contains a duplicated color at the beginning that we need to skip
        color: overwriteColor ?? colors[index + 1],
      };
    });

    const themeOverrides: PartialTheme = {
      legend: {
        labelOptions: {
          maxLines: args.legend.shouldTruncate ? args.legend?.maxLines ?? 1 : 0,
        },
      },
      heatmap: {
        grid: {
          stroke: {
            width:
              args.gridConfig.strokeWidth ??
              chartTheme.axes?.gridLine?.horizontal?.strokeWidth ??
              1,
            color:
              args.gridConfig.strokeColor ??
              chartTheme.axes?.gridLine?.horizontal?.stroke ??
              '#D3DAE6',
          },
          cellHeight: {
            max: 'fill',
            min: 1,
          },
        },
        cell: {
          maxWidth: 'fill',
          maxHeight: 'fill',
          label: {
            visible: args.gridConfig.isCellLabelVisible ?? false,
            minFontSize: 8,
            maxFontSize: 18,
            useGlobalMinFontSize: true, // override the min if there's a different directive upstream
          },
          border: {
            strokeWidth: 0,
          },
        },
        yAxisLabel: {
          visible: !!yAxisColumn && args.gridConfig.isYAxisLabelVisible,
          // eui color subdued
          textColor: chartTheme.axes?.tickLabel?.fill ?? '#6a717d',
          padding: yAxisColumn?.name ? 8 : 0,
        },
        xAxisLabel: {
          visible: Boolean(args.gridConfig.isXAxisLabelVisible && xAxisColumn),
          // eui color subdued
          textColor: chartTheme.axes?.tickLabel?.fill ?? `#6a717d`,
          padding: xAxisColumn?.name ? 8 : 0,
        },
        brushMask: {
          fill: isDarkTheme ? 'rgb(30,31,35,80%)' : 'rgb(247,247,247,50%)',
        },
        brushArea: {
          stroke: isDarkTheme ? 'rgb(255, 255, 255)' : 'rgb(105, 112, 125)',
        },
      },
    };

    const xAxisTitle = args.gridConfig.xTitle ?? xAxisColumn?.name;
    const yAxisTitle = args.gridConfig.yTitle ?? yAxisColumn?.name;

    return (
      <>
        {showLegend !== undefined && (
          <LegendToggle
            onClick={toggleLegend}
            showLegend={showLegend}
            legendPosition={args.legend.position}
          />
        )}
        <LegendColorPickerWrapperContext.Provider
          value={{
            uiState,
            setColor,
            legendPosition: args.legend.position,
          }}
        >
          <Chart>
            <Settings
              onElementClick={interactive ? (onElementClick as ElementClickListener) : undefined}
              showLegend={showLegend ?? args.legend.isVisible}
              legendPosition={args.legend.position}
              legendSize={args.legend.legendSize}
              legendColorPicker={uiState ? LegendColorPickerWrapper : undefined}
              debugState={window._echDebugStateFlag ?? false}
              tooltip={tooltip}
              theme={[themeOverrides, chartTheme]}
              xDomain={{
                min:
                  dateHistogramMeta && dateHistogramMeta.timeRange
                    ? new Date(dateHistogramMeta.timeRange.from).getTime()
                    : NaN,
                max:
                  dateHistogramMeta && dateHistogramMeta.timeRange
                    ? new Date(dateHistogramMeta.timeRange.to).getTime()
                    : NaN,
              }}
              onBrushEnd={interactive ? (onBrushEnd as BrushEndListener) : undefined}
              ariaLabel={args.ariaLabel}
              ariaUseDefaultSummary={!args.ariaLabel}
            />
            <Heatmap
              id="heatmap"
              name={valueColumn.name}
              colorScale={{
                type: 'bands',
                bands,
              }}
              timeZone={timeZone}
              data={chartData}
              xAccessor={xAccessor}
              yAccessor={yAccessor || 'unifiedY'}
              valueAccessor={valueAccessor}
              valueFormatter={valueFormatter}
              xScale={xScale}
              ySortPredicate={yAxisColumn ? getSortPredicate(yAxisColumn) : 'dataIndex'}
              xSortPredicate={xAxisColumn ? getSortPredicate(xAxisColumn) : 'dataIndex'}
              xAxisLabelName={xAxisColumn?.name}
              yAxisLabelName={yAxisColumn?.name}
              xAxisTitle={args.gridConfig.isXAxisTitleVisible ? xAxisTitle : undefined}
              yAxisTitle={args.gridConfig.isYAxisTitleVisible ? yAxisTitle : undefined}
              xAxisLabelFormatter={(v) =>
                args.gridConfig.isXAxisLabelVisible ? `${xValuesFormatter.convert(v)}` : ''
              }
              yAxisLabelFormatter={
                yAxisColumn
                  ? (v) =>
                      args.gridConfig.isYAxisLabelVisible
                        ? `${formatFactory(yAxisColumn.meta.params).convert(v) ?? ''}`
                        : ''
                  : undefined
              }
            />
          </Chart>
        </LegendColorPickerWrapperContext.Provider>
      </>
    );
  }
);

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { HeatmapComponent as default };
