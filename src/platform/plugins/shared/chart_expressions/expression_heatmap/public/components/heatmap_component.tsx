/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, FC, useMemo, useState, useCallback, useRef } from 'react';
import { ESQL_TABLE_TYPE } from '@kbn/data-plugin/common';
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
  ESFixedIntervalUnit,
  ESCalendarIntervalUnit,
  PartialTheme,
  SettingsProps,
  Tooltip,
  SeriesIdentifier,
  TooltipValue,
} from '@elastic/charts';
import type { CustomPaletteState } from '@kbn/charts-plugin/public';
import { search } from '@kbn/data-plugin/public';
import { LegendToggle, EmptyPlaceholder, useActiveCursor } from '@kbn/charts-plugin/public';
import {
  getAccessorByDimension,
  getFormatByAccessor,
} from '@kbn/visualizations-plugin/common/utils';
import {
  DEFAULT_LEGEND_SIZE,
  LegendSizeToPixels,
} from '@kbn/visualizations-plugin/common/constants';
import { i18n } from '@kbn/i18n';
import { DatatableColumn } from '@kbn/expressions-plugin/public';
import { IconChartHeatmap } from '@kbn/chart-icons';
import { getOverridesFor } from '@kbn/chart-expressions-common';
import type { HeatmapRenderProps, FilterEvent, BrushEvent } from '../../common';
import {
  applyPaletteParams,
  findMinMaxByColumnId,
  getFormattedTable,
  getSortPredicate,
} from './helpers';
import {
  LegendColorPickerWrapperContext,
  LegendColorPickerWrapper,
} from '../utils/get_color_picker';
import { defaultPaletteParams } from '../constants';
import { ChartSplit } from './chart_split';
import { getSplitDimensionAccessor, createSplitPoint } from '../utils/get_split_dimension_utils';

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
      return result;
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
    applyPaletteParams(
      paletteService,
      { type: 'palette', name: defaultPaletteParams.name },
      minMax
    ).map(({ color }) => color);
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
    data: table,
    args,
    timeZone,
    formatFactory,
    chartsThemeService,
    chartsActiveCursorService,
    datatableUtilities,
    onClickValue,
    onSelectRange,
    onClickMultiValue,
    paletteService,
    uiState,
    interactive,
    syncTooltips,
    syncCursor,
    renderComplete,
    overrides,
  }) => {
    const chartRef = useRef<Chart>(null);
    const isDarkTheme = chartsThemeService.useDarkMode();
    // legacy heatmap legend is handled by the uiState
    const [showLegend, setShowLegend] = useState<boolean>(() => {
      const bwcLegendStateDefault = args.legend.isVisible ?? true;
      return uiState?.get('vis.legendOpen', bwcLegendStateDefault);
    });

    const chartBaseTheme = chartsThemeService.useChartsBaseTheme();

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

    const onRenderChange = useCallback(
      (isRendered: boolean = true) => {
        if (isRendered) {
          renderComplete();
        }
      },
      [renderComplete]
    );
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
    const splitChartRowAccessor = args.splitRowAccessor
      ? getSplitDimensionAccessor(table.columns, args.splitRowAccessor, formatFactory)
      : undefined;
    const splitChartColumnAccessor = args.splitColumnAccessor
      ? getSplitDimensionAccessor(table.columns, args.splitColumnAccessor, formatFactory)
      : undefined;

    const xAxisColumnIndex = table.columns.findIndex((v) => v.id === xAccessor);
    const yAxisColumnIndex = table.columns.findIndex((v) => v.id === yAccessor);

    const xAxisColumn = table.columns[xAxisColumnIndex] as DatatableColumn | undefined;
    const yAxisColumn = table.columns[yAxisColumnIndex] as DatatableColumn | undefined;
    const valueColumn = table.columns.find((v) => v.id === valueAccessor) as
      | DatatableColumn
      | undefined;
    const xAxisMeta = xAxisColumn?.meta;
    const isTimeBasedSwimLane = xAxisMeta?.type === 'date';

    const xValuesFormatter = useMemo(
      () => formatFactory(xAxisMeta?.params),
      [formatFactory, xAxisMeta?.params]
    );
    const yValuesFormatter = useMemo(
      () => formatFactory(yAxisColumn?.meta.params),
      [formatFactory, yAxisColumn?.meta.params]
    );
    const metricFormatter = useMemo(
      () => formatFactory(getFormatByAccessor(args.valueAccessor!, table.columns)),
      [args.valueAccessor, formatFactory, table.columns]
    );

    const formattedTable = getFormattedTable(table, formatFactory);
    let chartData = formattedTable.table.rows.filter(
      (v) => v[valueAccessor!] === null || typeof v[valueAccessor!] === 'number'
    );

    const handleCursorUpdate = useActiveCursor(chartsActiveCursorService, chartRef, {
      datatables: [formattedTable.table],
    });

    const isEsqlMode = table?.meta?.type === ESQL_TABLE_TYPE;

    const hasTooltipActions = interactive && !isEsqlMode;

    const onElementClick = useCallback(
      (e: HeatmapElementEvent[]) => {
        const cell = e[0][0];
        const { x, y, smVerticalAccessorValue, smHorizontalAccessorValue } = cell.datum;

        const points = [
          {
            row: table.rows.findIndex((r) => {
              if (!xAxisColumn) return false;
              if (formattedTable.formattedColumns[xAxisColumn.id]) {
                // stringify the value to compare with the chart value
                return xValuesFormatter.convert(r[xAxisColumn.id]) === x;
              }
              return r[xAxisColumn.id] === x;
            }),
            column: xAxisColumnIndex,
            value: x,
            table,
          },
          ...(yAxisColumn
            ? [
                {
                  row: table.rows.findIndex((r) => {
                    if (formattedTable.formattedColumns[yAxisColumn.id]) {
                      // stringify the value to compare with the chart value
                      return yValuesFormatter.convert(r[yAxisColumn.id]) === y;
                    }
                    return r[yAxisColumn.id] === y;
                  }),
                  column: yAxisColumnIndex,
                  value: y,
                  table,
                },
              ]
            : []),
        ];

        if (smHorizontalAccessorValue && args.splitColumnAccessor) {
          const point = createSplitPoint(
            args.splitColumnAccessor,
            smHorizontalAccessorValue,
            formatFactory,
            table
          );
          if (point) {
            points.push(point);
          }
        }
        if (smVerticalAccessorValue && args.splitRowAccessor) {
          const point = createSplitPoint(
            args.splitRowAccessor,
            smVerticalAccessorValue,
            formatFactory,
            table
          );
          if (point) {
            points.push(point);
          }
        }

        onClickValue({
          data: points,
        });
      },
      [
        args.splitColumnAccessor,
        args.splitRowAccessor,
        formatFactory,
        formattedTable.formattedColumns,
        onClickValue,
        table,
        xAxisColumn,
        xAxisColumnIndex,
        xValuesFormatter,
        yAxisColumn,
        yAxisColumnIndex,
        yValuesFormatter,
      ]
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
                row: table.rows.findIndex((r) => {
                  if (formattedTable.formattedColumns[yAxisColumn.id]) {
                    // stringify the value to compare with the chart value
                    return yValuesFormatter.convert(r[yAxisColumn.id]) === v;
                  }
                  return r[yAxisColumn.id] === v;
                }),
                column: yAxisColumnIndex,
                value: v,
              });
            });
          }
          if (xAxisColumn) {
            (x as string[]).forEach((v) => {
              points.push({
                row: table.rows.findIndex((r) => {
                  if (formattedTable.formattedColumns[xAxisColumn.id]) {
                    // stringify the value to compare with the chart value
                    return xValuesFormatter.convert(r[xAxisColumn.id]) === v;
                  }
                  return r[xAxisColumn.id] === v;
                }),
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
        formattedTable.formattedColumns,
        isTimeBasedSwimLane,
        onClickValue,
        onSelectRange,
        table,
        xAxisColumn,
        xAxisColumnIndex,
        xValuesFormatter,
        yAxisColumn,
        yAxisColumnIndex,
        yValuesFormatter,
      ]
    );

    if (!chartData || !chartData.length) {
      return <EmptyPlaceholder icon={IconChartHeatmap} renderComplete={onRenderChange} />;
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
    if (!xAxisColumn) {
      // required for tooltip
      chartData = chartData.map((row) => {
        return {
          ...row,
          unifiedX: '',
        };
      });
    }
    const { min, max } = minMaxByColumnId[valueAccessor!];
    // formatters
    const dateHistogramMeta = xAxisColumn
      ? datatableUtilities.getDateHistogramMeta(xAxisColumn)
      : undefined;

    if (!valueColumn) {
      // Chart is not ready
      return null;
    }

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
      const isLastValue = index === array.length - 1;
      const nextValue = array[index + 1];
      // by default the last range is right-open
      let endValue = isLastValue ? Number.POSITIVE_INFINITY : nextValue;
      const startValue =
        isLastValue && hasSingleValue && paletteParams?.range !== 'number' ? min : start;

      // if the lastRangeIsRightOpen is set to false, we need to set the last range to the max value
      if (args.lastRangeIsRightOpen === false) {
        const lastBand = hasSingleValue ? Number.POSITIVE_INFINITY : endValueDistinctBounds;
        endValue = isLastValue ? lastBand : nextValue;
      }

      let overwriteArrayIdx;

      if (endValue === Number.POSITIVE_INFINITY) {
        overwriteArrayIdx = `≥ ${valueFormatter(startValue)}`;
      } else {
        overwriteArrayIdx = `${valueFormatter(start)} - ${valueFormatter(endValue)}`;
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

    const { theme: settingsThemeOverrides = {}, ...settingsOverrides } = getOverridesFor(
      overrides,
      'settings'
    ) as Partial<SettingsProps>;

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
              args.gridConfig.strokeWidth ?? chartBaseTheme.axes.gridLine.horizontal.strokeWidth,
            color: args.gridConfig.strokeColor ?? chartBaseTheme.axes.gridLine.horizontal.stroke,
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
          textColor: chartBaseTheme.axes.tickLabel.fill,
          padding: yAxisColumn?.name ? 8 : 0,
        },
        xAxisLabel: {
          visible: Boolean(args.gridConfig.isXAxisLabelVisible && xAxisColumn),
          // eui color subdued
          textColor: chartBaseTheme.axes.tickLabel.fill,
          padding: xAxisColumn?.name ? 8 : 0,
          rotation:
            args.gridConfig.xAxisLabelRotation && Math.abs(args.gridConfig.xAxisLabelRotation), // rotation is a positive value
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

    const filterSelectedTooltipValues = (
      tooltipSelectedValues: Array<
        TooltipValue<Record<'x' | 'y', string | number>, SeriesIdentifier>
      >
    ) => {
      const { datum } = tooltipSelectedValues[0];
      if (!datum) {
        return;
      }
      const { x, y } = datum;

      const shouldFilterByX = tooltipSelectedValues.some(
        ({ label }) => label === xAxisColumn?.name
      );

      const shouldFilterByY = tooltipSelectedValues.some(
        ({ label }) => label === yAxisColumn?.name
      );

      const cells = [
        ...(xAxisColumn && shouldFilterByX
          ? [
              {
                column: xAxisColumnIndex,
                row: table.rows.findIndex((r) => {
                  if (!xAxisColumn) return false;
                  if (formattedTable.formattedColumns[xAxisColumn.id]) {
                    // stringify the value to compare with the chart value
                    return xValuesFormatter.convert(r[xAxisColumn.id]) === x;
                  }
                  return r[xAxisColumn.id] === x;
                }),
              },
            ]
          : []),
        ...(yAxisColumn && shouldFilterByY
          ? [
              {
                column: yAxisColumnIndex,
                row: table.rows.findIndex((r) => {
                  if (formattedTable.formattedColumns[yAxisColumn.id]) {
                    // stringify the value to compare with the chart value
                    return yValuesFormatter.convert(r[yAxisColumn.id]) === y;
                  }
                  return r[yAxisColumn.id] === y;
                }),
              },
            ]
          : []),
      ];

      if (cells.length) {
        onClickMultiValue({
          data: [
            {
              table,
              cells,
            },
          ],
        });
      }
    };

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
          <Chart ref={chartRef} {...getOverridesFor(overrides, 'chart')}>
            <ChartSplit
              splitColumnAccessor={splitChartColumnAccessor}
              splitRowAccessor={splitChartRowAccessor}
            />
            <Tooltip<Record<string, string | number>, SeriesIdentifier>
              actions={
                hasTooltipActions
                  ? [
                      {
                        disabled: (selected) => selected.length < 1,
                        label: (selected) =>
                          selected.length === 0
                            ? i18n.translate(
                                'expressionHeatmap.tooltipActions.emptyFilterSelection',
                                {
                                  defaultMessage: 'Select at least one series to filter',
                                }
                              )
                            : i18n.translate('expressionHeatmap.tooltipActions.filterValues', {
                                defaultMessage: 'Filter {seriesNumber} series',
                                values: { seriesNumber: selected.length },
                              }),
                        onSelect: filterSelectedTooltipValues,
                      },
                    ]
                  : undefined
              }
              type={args.showTooltip ? TooltipType.Follow : TooltipType.None}
            />
            <Settings
              onRenderChange={onRenderChange}
              noResults={
                <EmptyPlaceholder icon={IconChartHeatmap} renderComplete={onRenderChange} />
              }
              onPointerUpdate={syncCursor ? handleCursorUpdate : undefined}
              externalPointerEvents={{
                tooltip: { visible: syncTooltips },
              }}
              onElementClick={interactive ? (onElementClick as ElementClickListener) : undefined}
              showLegend={showLegend ?? args.legend.isVisible}
              legendPosition={args.legend.position}
              legendSize={LegendSizeToPixels[args.legend.legendSize ?? DEFAULT_LEGEND_SIZE]}
              legendColorPicker={uiState ? LegendColorPickerWrapper : undefined}
              debugState={window._echDebugStateFlag ?? false}
              theme={[
                themeOverrides,
                ...(Array.isArray(settingsThemeOverrides)
                  ? settingsThemeOverrides
                  : [settingsThemeOverrides]),
              ]}
              baseTheme={chartBaseTheme}
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
              locale={i18n.getLocale()}
              {...settingsOverrides}
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
              xAccessor={xAccessor || 'unifiedX'}
              yAccessor={yAccessor || 'unifiedY'}
              valueAccessor={valueAccessor}
              valueFormatter={valueFormatter}
              xScale={xScale}
              ySortPredicate={yAxisColumn ? getSortPredicate(yAxisColumn) : 'dataIndex'}
              xSortPredicate={xAxisColumn ? getSortPredicate(xAxisColumn) : 'dataIndex'}
              xAxisLabelName={xAxisColumn?.name || ''}
              yAxisLabelName={yAxisColumn?.name || ''}
              xAxisTitle={args.gridConfig.isXAxisTitleVisible ? xAxisTitle : undefined}
              yAxisTitle={args.gridConfig.isYAxisTitleVisible ? yAxisTitle : undefined}
              xAxisLabelFormatter={(v) =>
                `${
                  xAccessor && formattedTable.formattedColumns[xAccessor]
                    ? v
                    : xValuesFormatter.convert(v)
                }`
              }
              yAxisLabelFormatter={
                yAxisColumn
                  ? (v) =>
                      `${
                        yAccessor && formattedTable.formattedColumns[yAccessor]
                          ? v
                          : yValuesFormatter.convert(v) ?? ''
                      }`
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
