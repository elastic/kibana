/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef } from 'react';
import {
  Chart,
  Settings,
  Axis,
  LineSeries,
  AreaSeries,
  BarSeries,
  Position,
  GeometryValue,
  XYChartSeriesIdentifier,
  StackMode,
  VerticalAlignment,
  HorizontalAlignment,
  LayoutDirection,
  ElementClickListener,
  BrushEndListener,
  XYBrushEvent,
  CurveType,
  LegendPositionConfig,
  LabelOverflowConstraint,
  DisplayValueStyle,
  RecursivePartial,
  AxisStyle,
  ScaleType,
  AreaSeriesProps,
  BarSeriesProps,
  LineSeriesProps,
  ColorVariant,
} from '@elastic/charts';
import { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PaletteRegistry, SeriesLayer } from '@kbn/coloring';
import type { Datatable, DatatableRow, DatatableColumn } from '@kbn/expressions-plugin/public';
import { RenderMode } from '@kbn/expressions-plugin/common';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { ChartsPluginSetup, ChartsPluginStart, useActiveCursor } from '@kbn/charts-plugin/public';
import { MULTILAYER_TIME_AXIS_STYLE } from '@kbn/charts-plugin/common';
import type { FilterEvent, BrushEvent, FormatFactory } from '../types';
import type { SeriesType, XYChartProps } from '../../common/types';
import { isHorizontalChart, getSeriesColor, getAnnotationsLayers, getDataLayers } from '../helpers';
import {
  getFilteredLayers,
  getReferenceLayers,
  isDataLayer,
  getFitOptions,
  getAxesConfiguration,
  GroupsConfiguration,
  validateExtent,
  getColorAssignments,
  getLinesCausedPaddings,
} from '../helpers';
import { getXDomain, XyEndzones } from './x_domain';
import { getLegendAction } from './legend_action';
import { ReferenceLineAnnotations, computeChartMargins } from './reference_lines';
import { visualizationDefinitions } from '../definitions';
import { XYLayerConfigResult } from '../../common/types';
import { Annotations, getAnnotationsGroupedByInterval } from './annotations';

import './xy_chart.scss';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

type SeriesSpec = LineSeriesProps & BarSeriesProps & AreaSeriesProps;

export type XYChartRenderProps = XYChartProps & {
  chartsThemeService: ChartsPluginSetup['theme'];
  chartsActiveCursorService: ChartsPluginStart['activeCursor'];
  paletteService: PaletteRegistry;
  formatFactory: FormatFactory;
  timeZone: string;
  useLegacyTimeAxis: boolean;
  minInterval: number | undefined;
  interactive?: boolean;
  onClickValue: (data: FilterEvent['data']) => void;
  onSelectRange: (data: BrushEvent['data']) => void;
  renderMode: RenderMode;
  syncColors: boolean;
  eventAnnotationService: EventAnnotationServiceType;
};

const isPrimitive = (value: unknown): boolean => value != null && typeof value !== 'object';

function getValueLabelsStyling(isHorizontal: boolean): {
  displayValue: RecursivePartial<DisplayValueStyle>;
} {
  const VALUE_LABELS_MAX_FONTSIZE = 12;
  const VALUE_LABELS_MIN_FONTSIZE = 10;
  const VALUE_LABELS_VERTICAL_OFFSET = -10;
  const VALUE_LABELS_HORIZONTAL_OFFSET = 10;

  return {
    displayValue: {
      fontSize: { min: VALUE_LABELS_MIN_FONTSIZE, max: VALUE_LABELS_MAX_FONTSIZE },
      fill: { textBorder: 0 },
      alignment: isHorizontal
        ? { vertical: VerticalAlignment.Middle }
        : { horizontal: HorizontalAlignment.Center },
      offsetX: isHorizontal ? VALUE_LABELS_HORIZONTAL_OFFSET : 0,
      offsetY: isHorizontal ? 0 : VALUE_LABELS_VERTICAL_OFFSET,
    },
  };
}

function getIconForSeriesType(seriesType: SeriesType): IconType {
  return visualizationDefinitions.find((c) => c.id === seriesType)!.icon || 'empty';
}

export const XYChartReportable = React.memo(XYChart);

export function XYChart({
  data,
  args,
  formatFactory,
  timeZone,
  chartsThemeService,
  chartsActiveCursorService,
  paletteService,
  minInterval,
  onClickValue,
  onSelectRange,
  interactive = true,
  syncColors,
  useLegacyTimeAxis,
}: XYChartRenderProps) {
  const {
    legend,
    layers,
    fittingFunction,
    endValue,
    emphasizeFitting,
    gridlinesVisibilitySettings,
    valueLabels,
    hideEndzones,
    yLeftExtent,
    yRightExtent,
    valuesInLegend,
  } = args;
  const chartRef = useRef<Chart>(null);
  const chartTheme = chartsThemeService.useChartsTheme();
  const chartBaseTheme = chartsThemeService.useChartsBaseTheme();
  const darkMode = chartsThemeService.useDarkMode();
  const filteredLayers = getFilteredLayers(layers, data);
  const layersById = filteredLayers.reduce<Record<string, XYLayerConfigResult>>(
    (hashMap, layer) => {
      hashMap[layer.layerId] = layer;
      return hashMap;
    },
    {}
  );

  const handleCursorUpdate = useActiveCursor(chartsActiveCursorService, chartRef, {
    datatables: Object.values(data.tables),
  });

  if (filteredLayers.length === 0) {
    const icon: IconType = getIconForSeriesType(getDataLayers(layers)?.[0]?.seriesType || 'bar');
    return <EmptyPlaceholder className="xyChart__empty" icon={icon} />;
  }

  // use formatting hint of first x axis column to format ticks
  const xAxisColumn = data.tables[filteredLayers[0].layerId].columns.find(
    ({ id }) => id === filteredLayers[0].xAccessor
  );

  const xAxisFormatter = formatFactory(xAxisColumn && xAxisColumn.meta?.params);
  const layersAlreadyFormatted: Record<string, boolean> = {};

  // This is a safe formatter for the xAccessor that abstracts the knowledge of already formatted layers
  const safeXAccessorLabelRenderer = (value: unknown): string =>
    xAxisColumn && layersAlreadyFormatted[xAxisColumn.id]
      ? String(value)
      : String(xAxisFormatter.convert(value));

  const chartHasMoreThanOneSeries =
    filteredLayers.length > 1 ||
    filteredLayers.some((layer) => layer.accessors.length > 1) ||
    filteredLayers.some((layer) => layer.splitAccessor);
  const shouldRotate = isHorizontalChart(filteredLayers);

  const yAxesConfiguration = getAxesConfiguration(
    filteredLayers,
    shouldRotate,
    data.tables,
    formatFactory
  );

  const xTitle = args.xTitle || (xAxisColumn && xAxisColumn.name);
  const axisTitlesVisibilitySettings = args.axisTitlesVisibilitySettings || {
    x: true,
    yLeft: true,
    yRight: true,
  };
  const tickLabelsVisibilitySettings = args.tickLabelsVisibilitySettings || {
    x: true,
    yLeft: true,
    yRight: true,
  };

  const labelsOrientation = args.labelsOrientation || {
    x: 0,
    yLeft: 0,
    yRight: 0,
  };

  const filteredBarLayers = filteredLayers.filter((layer) => layer.seriesType.includes('bar'));

  const chartHasMoreThanOneBarSeries =
    filteredBarLayers.length > 1 ||
    filteredBarLayers.some((layer) => layer.accessors.length > 1) ||
    filteredBarLayers.some((layer) => layer.splitAccessor);

  const isTimeViz = Boolean(filteredLayers.every((l) => l.xScaleType === 'time'));
  const isHistogramViz = filteredLayers.every((l) => l.isHistogram);

  const { baseDomain: rawXDomain, extendedDomain: xDomain } = getXDomain(
    filteredLayers,
    data,
    minInterval,
    isTimeViz,
    isHistogramViz
  );

  const yAxesMap = {
    left: yAxesConfiguration.find(({ groupId }) => groupId === 'left'),
    right: yAxesConfiguration.find(({ groupId }) => groupId === 'right'),
  };

  const getYAxesTitles = (
    axisSeries: Array<{ layer: string; accessor: string }>,
    groupId: string
  ) => {
    const yTitle = groupId === 'right' ? args.yRightTitle : args.yTitle;
    return (
      yTitle ||
      axisSeries
        .map(
          (series) =>
            data.tables[series.layer].columns.find((column) => column.id === series.accessor)?.name
        )
        .filter((name) => Boolean(name))[0]
    );
  };

  const referenceLineLayers = getReferenceLayers(layers);
  const annotationsLayers = getAnnotationsLayers(layers);
  const firstTable = data.tables[filteredLayers[0].layerId];

  const xColumnId = firstTable.columns.find((col) => col.id === filteredLayers[0].xAccessor)?.id;

  const groupedAnnotations = getAnnotationsGroupedByInterval(
    annotationsLayers,
    minInterval,
    xColumnId ? firstTable.rows[0]?.[xColumnId] : undefined,
    xAxisFormatter
  );
  const visualConfigs = [
    ...referenceLineLayers.flatMap(({ yConfig }) => yConfig),
    ...groupedAnnotations,
  ].filter(Boolean);

  const linesPaddings = getLinesCausedPaddings(visualConfigs, yAxesMap);

  const getYAxesStyle = (groupId: 'left' | 'right') => {
    const tickVisible =
      groupId === 'right'
        ? tickLabelsVisibilitySettings?.yRight
        : tickLabelsVisibilitySettings?.yLeft;

    const style = {
      tickLabel: {
        visible: tickVisible,
        rotation:
          groupId === 'right'
            ? args.labelsOrientation?.yRight || 0
            : args.labelsOrientation?.yLeft || 0,
        padding:
          linesPaddings[groupId] != null
            ? {
                inner: linesPaddings[groupId],
              }
            : undefined,
      },
      axisTitle: {
        visible:
          groupId === 'right'
            ? axisTitlesVisibilitySettings?.yRight
            : axisTitlesVisibilitySettings?.yLeft,
        // if labels are not visible add the padding to the title
        padding:
          !tickVisible && linesPaddings[groupId] != null
            ? {
                inner: linesPaddings[groupId],
              }
            : undefined,
      },
    };
    return style;
  };

  const getYAxisDomain = (axis: GroupsConfiguration[number]) => {
    const extent = axis.groupId === 'left' ? yLeftExtent : yRightExtent;
    const hasBarOrArea = Boolean(
      axis.series.some((series) => {
        const layer = layersById[series.layer];
        if (!(layer && isDataLayer(layer))) {
          return false;
        }

        return layer.seriesType.includes('bar') || layer.seriesType.includes('area');
      })
    );
    const fit = !hasBarOrArea && extent.mode === 'dataBounds';
    let min: number = NaN;
    let max: number = NaN;

    if (extent.mode === 'custom') {
      const { inclusiveZeroError, boundaryError } = validateExtent(hasBarOrArea, extent);
      if (!inclusiveZeroError && !boundaryError) {
        min = extent.lowerBound ?? NaN;
        max = extent.upperBound ?? NaN;
      }
    }

    return {
      fit,
      min,
      max,
      includeDataFromIds: referenceLineLayers
        .flatMap((l) =>
          l.yConfig ? l.yConfig.map((yConfig) => ({ layerId: l.layerId, yConfig })) : []
        )
        .filter(({ yConfig }) => yConfig.axisMode === axis.groupId)
        .map(
          ({ layerId, yConfig }) =>
            `${layerId}-${yConfig.forAccessor}-${yConfig.fill !== 'none' ? 'rect' : 'line'}`
        ),
    };
  };

  const shouldShowValueLabels =
    // No stacked bar charts
    filteredLayers.every((layer) => !layer.seriesType.includes('stacked')) &&
    // No histogram charts
    !isHistogramViz;

  const valueLabelsStyling =
    shouldShowValueLabels && valueLabels !== 'hide' && getValueLabelsStyling(shouldRotate);

  const colorAssignments = getColorAssignments(getDataLayers(args.layers), data, formatFactory);

  const clickHandler: ElementClickListener = ([[geometry, series]]) => {
    // for xyChart series is always XYChartSeriesIdentifier and geometry is always type of GeometryValue
    const xySeries = series as XYChartSeriesIdentifier;
    const xyGeometry = geometry as GeometryValue;

    const layer = filteredLayers.find((l) =>
      xySeries.seriesKeys.some((key: string | number) => l.accessors.includes(key.toString()))
    );
    if (!layer) {
      return;
    }

    const table = data.tables[layer.layerId];

    const xColumn = table.columns.find((col) => col.id === layer.xAccessor);
    const currentXFormatter =
      layer.xAccessor && layersAlreadyFormatted[layer.xAccessor] && xColumn
        ? formatFactory(xColumn.meta.params)
        : xAxisFormatter;

    const rowIndex = table.rows.findIndex((row) => {
      if (layer.xAccessor) {
        if (layersAlreadyFormatted[layer.xAccessor]) {
          // stringify the value to compare with the chart value
          return currentXFormatter.convert(row[layer.xAccessor]) === xyGeometry.x;
        }
        return row[layer.xAccessor] === xyGeometry.x;
      }
    });

    const points = [
      {
        row: rowIndex,
        column: table.columns.findIndex((col) => col.id === layer.xAccessor),
        value: layer.xAccessor ? table.rows[rowIndex][layer.xAccessor] : xyGeometry.x,
      },
    ];

    if (xySeries.seriesKeys.length > 1) {
      const pointValue = xySeries.seriesKeys[0];

      const splitColumn = table.columns.find(({ id }) => id === layer.splitAccessor);
      const splitFormatter = formatFactory(splitColumn && splitColumn.meta?.params);

      points.push({
        row: table.rows.findIndex((row) => {
          if (layer.splitAccessor) {
            if (layersAlreadyFormatted[layer.splitAccessor]) {
              return splitFormatter.convert(row[layer.splitAccessor]) === pointValue;
            }
            return row[layer.splitAccessor] === pointValue;
          }
        }),
        column: table.columns.findIndex((col) => col.id === layer.splitAccessor),
        value: pointValue,
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
  };

  const brushHandler = ({ x }: XYBrushEvent) => {
    if (!x) {
      return;
    }
    const [min, max] = x;
    if (!xAxisColumn || !isHistogramViz) {
      return;
    }

    const table = data.tables[filteredLayers[0].layerId];

    const xAxisColumnIndex = table.columns.findIndex((el) => el.id === filteredLayers[0].xAccessor);

    const context: BrushEvent['data'] = {
      range: [min, max],
      table,
      column: xAxisColumnIndex,
    };
    onSelectRange(context);
  };

  const legendInsideParams = {
    vAlign: legend.verticalAlignment ?? VerticalAlignment.Top,
    hAlign: legend?.horizontalAlignment ?? HorizontalAlignment.Right,
    direction: LayoutDirection.Vertical,
    floating: true,
    floatingColumns: legend?.floatingColumns ?? 1,
  } as LegendPositionConfig;

  const isHistogramModeEnabled = filteredLayers.some(
    ({ isHistogram, seriesType }) =>
      isHistogram &&
      (seriesType.includes('stacked') ||
        !seriesType.includes('bar') ||
        !chartHasMoreThanOneBarSeries)
  );

  const shouldUseNewTimeAxis =
    isTimeViz && isHistogramModeEnabled && !useLegacyTimeAxis && !shouldRotate;

  const gridLineStyle = {
    visible: gridlinesVisibilitySettings?.x,
    strokeWidth: 1,
  };
  const xAxisStyle: RecursivePartial<AxisStyle> = shouldUseNewTimeAxis
    ? {
        ...MULTILAYER_TIME_AXIS_STYLE,
        tickLabel: {
          ...MULTILAYER_TIME_AXIS_STYLE.tickLabel,
          visible: Boolean(tickLabelsVisibilitySettings?.x),
        },
        tickLine: {
          ...MULTILAYER_TIME_AXIS_STYLE.tickLine,
          visible: Boolean(tickLabelsVisibilitySettings?.x),
        },
        axisTitle: {
          visible: axisTitlesVisibilitySettings.x,
        },
      }
    : {
        tickLabel: {
          visible: tickLabelsVisibilitySettings?.x,
          rotation: labelsOrientation?.x,
          padding: linesPaddings.bottom != null ? { inner: linesPaddings.bottom } : undefined,
        },
        axisTitle: {
          visible: axisTitlesVisibilitySettings.x,
          padding:
            !tickLabelsVisibilitySettings?.x && linesPaddings.bottom != null
              ? { inner: linesPaddings.bottom }
              : undefined,
        },
      };

  return (
    <Chart ref={chartRef}>
      <Settings
        onPointerUpdate={handleCursorUpdate}
        debugState={window._echDebugStateFlag ?? false}
        showLegend={
          legend.isVisible && !legend.showSingleSeries
            ? chartHasMoreThanOneSeries
            : legend.isVisible
        }
        legendPosition={legend?.isInside ? legendInsideParams : legend.position}
        legendSize={legend.legendSize}
        theme={{
          ...chartTheme,
          barSeriesStyle: {
            ...chartTheme.barSeriesStyle,
            ...valueLabelsStyling,
          },
          background: {
            color: undefined, // removes background for embeddables
          },
          legend: {
            labelOptions: { maxLines: legend.shouldTruncate ? legend?.maxLines ?? 1 : 0 },
          },
          // if not title or labels are shown for axes, add some padding if required by reference line markers
          chartMargins: {
            ...chartTheme.chartPaddings,
            ...computeChartMargins(
              linesPaddings,
              tickLabelsVisibilitySettings,
              axisTitlesVisibilitySettings,
              yAxesMap,
              shouldRotate
            ),
          },
        }}
        baseTheme={chartBaseTheme}
        tooltip={{
          boundary: document.getElementById('app-fixed-viewport') ?? undefined,
          headerFormatter: (d) => safeXAccessorLabelRenderer(d.value),
        }}
        allowBrushingLastHistogramBin={isTimeViz}
        rotation={shouldRotate ? 90 : 0}
        xDomain={xDomain}
        onBrushEnd={interactive ? (brushHandler as BrushEndListener) : undefined}
        onElementClick={interactive ? clickHandler : undefined}
        legendAction={
          interactive
            ? getLegendAction(
                filteredLayers,
                data.tables,
                onClickValue,
                formatFactory,
                layersAlreadyFormatted
              )
            : undefined
        }
        showLegendExtra={isHistogramViz && valuesInLegend}
        ariaLabel={args.ariaLabel}
        ariaUseDefaultSummary={!args.ariaLabel}
      />

      <Axis
        id="x"
        position={shouldRotate ? Position.Left : Position.Bottom}
        title={xTitle}
        gridLine={gridLineStyle}
        hide={filteredLayers[0].hide || !filteredLayers[0].xAccessor}
        tickFormat={(d) => safeXAccessorLabelRenderer(d)}
        style={xAxisStyle}
        timeAxisLayerCount={shouldUseNewTimeAxis ? 3 : 0}
      />

      {yAxesConfiguration.map((axis) => {
        return (
          <Axis
            key={axis.groupId}
            id={axis.groupId}
            groupId={axis.groupId}
            position={axis.position}
            title={getYAxesTitles(axis.series, axis.groupId)}
            gridLine={{
              visible:
                axis.groupId === 'right'
                  ? gridlinesVisibilitySettings?.yRight
                  : gridlinesVisibilitySettings?.yLeft,
            }}
            hide={filteredLayers[0].hide}
            tickFormat={(d) => axis.formatter?.convert(d) || ''}
            style={getYAxesStyle(axis.groupId as 'left' | 'right')}
            domain={getYAxisDomain(axis)}
            ticks={5}
          />
        );
      })}

      {!hideEndzones && (
        <XyEndzones
          baseDomain={rawXDomain}
          extendedDomain={xDomain}
          darkMode={darkMode}
          histogramMode={filteredLayers.every(
            (layer) =>
              layer.isHistogram &&
              (layer.seriesType.includes('stacked') || !layer.splitAccessor) &&
              (layer.seriesType.includes('stacked') ||
                !layer.seriesType.includes('bar') ||
                !chartHasMoreThanOneBarSeries)
          )}
        />
      )}

      {filteredLayers.flatMap((layer, layerIndex) =>
        layer.accessors.map((accessor, accessorIndex) => {
          const {
            splitAccessor,
            seriesType,
            accessors,
            xAccessor,
            layerId,
            columnToLabel,
            yScaleType,
            xScaleType,
            isHistogram,
            palette,
          } = layer;
          const columnToLabelMap: Record<string, string> = columnToLabel
            ? JSON.parse(columnToLabel)
            : {};

          const table = data.tables[layerId];

          const formatterPerColumn = new Map<DatatableColumn, FieldFormat>();
          for (const column of table.columns) {
            formatterPerColumn.set(column, formatFactory(column.meta.params));
          }

          // what if row values are not primitive? That is the case of, for instance, Ranges
          // remaps them to their serialized version with the formatHint metadata
          // In order to do it we need to make a copy of the table as the raw one is required for more features (filters, etc...) later on
          const tableConverted: Datatable = {
            ...table,
            rows: table.rows.map((row: DatatableRow) => {
              const newRow = { ...row };
              for (const column of table.columns) {
                const record = newRow[column.id];
                if (
                  record != null &&
                  // pre-format values for ordinal x axes because there can only be a single x axis formatter on chart level
                  (!isPrimitive(record) || (column.id === xAccessor && xScaleType === 'ordinal'))
                ) {
                  newRow[column.id] = formatterPerColumn.get(column)!.convert(record);
                }
              }
              return newRow;
            }),
          };

          // save the id of the layer with the custom table
          table.columns.reduce<Record<string, boolean>>(
            (alreadyFormatted: Record<string, boolean>, { id }) => {
              if (alreadyFormatted[id]) {
                return alreadyFormatted;
              }
              alreadyFormatted[id] = table.rows.some(
                (row, i) => row[id] !== tableConverted.rows[i][id]
              );
              return alreadyFormatted;
            },
            layersAlreadyFormatted
          );

          const isStacked = seriesType.includes('stacked');
          const isPercentage = seriesType.includes('percentage');
          const isBarChart = seriesType.includes('bar');
          const enableHistogramMode =
            isHistogram &&
            (isStacked || !splitAccessor) &&
            (isStacked || !isBarChart || !chartHasMoreThanOneBarSeries);

          // For date histogram chart type, we're getting the rows that represent intervals without data.
          // To not display them in the legend, they need to be filtered out.
          const rows = tableConverted.rows.filter(
            (row) =>
              !(xAccessor && typeof row[xAccessor] === 'undefined') &&
              !(
                splitAccessor &&
                typeof row[splitAccessor] === 'undefined' &&
                typeof row[accessor] === 'undefined'
              )
          );

          if (!xAccessor) {
            rows.forEach((row) => {
              row.unifiedX = i18n.translate('expressionXY.xyChart.emptyXLabel', {
                defaultMessage: '(empty)',
              });
            });
          }

          const yAxis = yAxesConfiguration.find((axisConfiguration) =>
            axisConfiguration.series.find((currentSeries) => currentSeries.accessor === accessor)
          );

          const formatter = table?.columns.find((column) => column.id === accessor)?.meta?.params;
          const splitHint = table.columns.find((col) => col.id === splitAccessor)?.meta?.params;
          const splitFormatter = formatFactory(splitHint);

          const seriesProps: SeriesSpec = {
            splitSeriesAccessors: splitAccessor ? [splitAccessor] : [],
            stackAccessors: isStacked ? [xAccessor as string] : [],
            id: `${splitAccessor}-${accessor}`,
            xAccessor: xAccessor || 'unifiedX',
            yAccessors: [accessor],
            data: rows,
            xScaleType: xAccessor ? xScaleType : 'ordinal',
            yScaleType:
              formatter?.id === 'bytes' && yScaleType === ScaleType.Linear
                ? ScaleType.LinearBinary
                : yScaleType,
            color: ({ yAccessor, seriesKeys }) => {
              const overwriteColor = getSeriesColor(layer, accessor);
              if (overwriteColor !== null) {
                return overwriteColor;
              }
              const colorAssignment = colorAssignments[palette.name];
              const seriesLayers: SeriesLayer[] = [
                {
                  name: splitAccessor ? String(seriesKeys[0]) : columnToLabelMap[seriesKeys[0]],
                  totalSeriesAtDepth: colorAssignment.totalSeriesCount,
                  rankAtDepth: colorAssignment.getRank(
                    layer,
                    String(seriesKeys[0]),
                    String(yAccessor)
                  ),
                },
              ];
              return paletteService.get(palette.name).getCategoricalColor(
                seriesLayers,
                {
                  maxDepth: 1,
                  behindText: false,
                  totalSeries: colorAssignment.totalSeriesCount,
                  syncColors,
                },
                palette.params
              );
            },
            groupId: yAxis?.groupId,
            enableHistogramMode,
            stackMode: isPercentage ? StackMode.Percentage : undefined,
            timeZone,
            areaSeriesStyle: {
              point: {
                visible: !xAccessor,
                radius: xAccessor && !emphasizeFitting ? 5 : 0,
              },
              ...(args.fillOpacity && { area: { opacity: args.fillOpacity } }),
              ...(emphasizeFitting && {
                fit: {
                  area: {
                    opacity: args.fillOpacity || 0.5,
                  },
                  line: {
                    visible: true,
                    stroke: ColorVariant.Series,
                    opacity: 1,
                    dash: [],
                  },
                },
              }),
            },
            lineSeriesStyle: {
              point: {
                visible: !xAccessor,
                radius: xAccessor && !emphasizeFitting ? 5 : 0,
              },
              ...(emphasizeFitting && {
                fit: {
                  line: {
                    visible: true,
                    stroke: ColorVariant.Series,
                    opacity: 1,
                    dash: [],
                  },
                },
              }),
            },
            name(d) {
              // For multiple y series, the name of the operation is used on each, either:
              // * Key - Y name
              // * Formatted value - Y name
              if (accessors.length > 1) {
                const result = d.seriesKeys
                  .map((key: string | number, i) => {
                    if (
                      i === 0 &&
                      splitHint &&
                      splitAccessor &&
                      !layersAlreadyFormatted[splitAccessor]
                    ) {
                      return splitFormatter.convert(key);
                    }
                    return splitAccessor && i === 0 ? key : columnToLabelMap[key] ?? '';
                  })
                  .join(' - ');
                return result;
              }

              // For formatted split series, format the key
              // This handles splitting by dates, for example
              if (splitHint) {
                if (splitAccessor && layersAlreadyFormatted[splitAccessor]) {
                  return d.seriesKeys[0];
                }
                return splitFormatter.convert(d.seriesKeys[0]);
              }
              // This handles both split and single-y cases:
              // * If split series without formatting, show the value literally
              // * If single Y, the seriesKey will be the accessor, so we show the human-readable name
              return splitAccessor ? d.seriesKeys[0] : columnToLabelMap[d.seriesKeys[0]] ?? '';
            },
          };

          const index = `${layerIndex}-${accessorIndex}`;

          const curveType = args.curveType ? CurveType[args.curveType] : undefined;

          switch (seriesType) {
            case 'line':
              return (
                <LineSeries
                  key={index}
                  {...seriesProps}
                  fit={getFitOptions(fittingFunction, endValue)}
                  curve={curveType}
                />
              );
            case 'bar':
            case 'bar_stacked':
            case 'bar_percentage_stacked':
            case 'bar_horizontal':
            case 'bar_horizontal_stacked':
            case 'bar_horizontal_percentage_stacked':
              const valueLabelsSettings = {
                displayValueSettings: {
                  // This format double fixes two issues in elastic-chart
                  // * when rotating the chart, the formatter is not correctly picked
                  // * in some scenarios value labels are not strings, and this breaks the elastic-chart lib
                  valueFormatter: (d: unknown) => yAxis?.formatter?.convert(d) || '',
                  showValueLabel: shouldShowValueLabels && valueLabels !== 'hide',
                  isValueContainedInElement: false,
                  isAlternatingValueLabel: false,
                  overflowConstraints: [
                    LabelOverflowConstraint.ChartEdges,
                    LabelOverflowConstraint.BarGeometry,
                  ],
                },
              };
              return <BarSeries key={index} {...seriesProps} {...valueLabelsSettings} />;
            case 'area_stacked':
            case 'area_percentage_stacked':
              return (
                <AreaSeries
                  key={index}
                  {...seriesProps}
                  fit={isPercentage ? 'zero' : getFitOptions(fittingFunction, endValue)}
                  curve={curveType}
                />
              );
            case 'area':
              return (
                <AreaSeries
                  key={index}
                  {...seriesProps}
                  fit={getFitOptions(fittingFunction, endValue)}
                  curve={curveType}
                />
              );
            default:
              return assertNever(seriesType);
          }
        })
      )}
      {referenceLineLayers.length ? (
        <ReferenceLineAnnotations
          layers={referenceLineLayers}
          data={data}
          formatters={{
            left: yAxesMap.left?.formatter,
            right: yAxesMap.right?.formatter,
            bottom: xAxisFormatter,
          }}
          axesMap={{
            left: Boolean(yAxesMap.left),
            right: Boolean(yAxesMap.right),
          }}
          isHorizontal={shouldRotate}
          paddingMap={linesPaddings}
        />
      ) : null}
      {groupedAnnotations.length ? (
        <Annotations
          hide={annotationsLayers?.[0].hide}
          groupedAnnotations={groupedAnnotations}
          formatter={xAxisFormatter}
          isHorizontal={shouldRotate}
          paddingMap={linesPaddings}
          isBarChart={filteredBarLayers.length > 0}
          minInterval={minInterval}
        />
      ) : null}
    </Chart>
  );
}

function assertNever(x: never): never {
  throw new Error('Unexpected series type: ' + x);
}
