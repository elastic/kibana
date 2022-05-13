/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useRef } from 'react';
import {
  Chart,
  Settings,
  Axis,
  Position,
  GeometryValue,
  XYChartSeriesIdentifier,
  VerticalAlignment,
  HorizontalAlignment,
  LayoutDirection,
  ElementClickListener,
  BrushEndListener,
  XYBrushEvent,
  LegendPositionConfig,
  DisplayValueStyle,
  RecursivePartial,
  AxisStyle,
  Placement,
} from '@elastic/charts';
import { IconType } from '@elastic/eui';
import { PaletteRegistry } from '@kbn/coloring';
import { RenderMode } from '@kbn/expressions-plugin/common';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { ChartsPluginSetup, ChartsPluginStart, useActiveCursor } from '@kbn/charts-plugin/public';
import { MULTILAYER_TIME_AXIS_STYLE } from '@kbn/charts-plugin/common';
import {
  DEFAULT_LEGEND_SIZE,
  LegendSizeToPixels,
} from '@kbn/visualizations-plugin/common/constants';
import type { FilterEvent, BrushEvent, FormatFactory } from '../types';
import type { CommonXYDataLayerConfig, XYChartProps } from '../../common/types';
import {
  isHorizontalChart,
  getAnnotationsLayers,
  getDataLayers,
  AxisConfiguration,
  getAxisPosition,
  getFormattedTablesByLayers,
  validateExtent,
  getFormat,
} from '../helpers';
import {
  getFilteredLayers,
  getReferenceLayers,
  isDataLayer,
  getAxesConfiguration,
  GroupsConfiguration,
  getLinesCausedPaddings,
  getAxisGroupConfig,
} from '../helpers';
import { getXDomain, XyEndzones } from './x_domain';
import { getLegendAction } from './legend_action';
import { ReferenceLineAnnotations, computeChartMargins } from './reference_lines';
import { visualizationDefinitions } from '../definitions';
import { CommonXYLayerConfig } from '../../common/types';
import { SplitChart } from './split_chart';
import {
  Annotations,
  getAnnotationsGroupedByInterval,
  getRangeAnnotations,
  OUTSIDE_RECT_ANNOTATION_WIDTH,
  OUTSIDE_RECT_ANNOTATION_WIDTH_SUGGESTION,
} from './annotations';
import { AxisExtentModes, SeriesTypes, ValueLabelModes } from '../../common/constants';
import { DataLayers } from './data_layers';
import './xy_chart.scss';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

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
  syncTooltips: boolean;
  eventAnnotationService: EventAnnotationServiceType;
};

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

function getIconForSeriesType(layer: CommonXYDataLayerConfig): IconType {
  return (
    visualizationDefinitions.find(
      (c) =>
        c.id ===
        `${layer.seriesType}${layer.isHorizontal ? '_horizontal' : ''}${
          layer.isPercentage ? '_percentage' : ''
        }${layer.isStacked ? '_stacked' : ''}`
    )!.icon || 'empty'
  );
}

export const XYChartReportable = React.memo(XYChart);

export function XYChart({
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
  syncTooltips,
  useLegacyTimeAxis,
}: XYChartRenderProps) {
  const {
    legend,
    layers,
    fittingFunction,
    endValue,
    emphasizeFitting,
    valueLabels,
    hideEndzones,
    valuesInLegend,
    axes,
    xAxisConfig,
    splitColumnAccessor,
    splitRowAccessor,
  } = args;
  const chartRef = useRef<Chart>(null);
  const chartTheme = chartsThemeService.useChartsTheme();
  const chartBaseTheme = chartsThemeService.useChartsBaseTheme();
  const darkMode = chartsThemeService.useDarkMode();
  const filteredLayers = getFilteredLayers(layers);
  const layersById = filteredLayers.reduce<Record<string, CommonXYLayerConfig>>(
    (hashMap, layer) => ({ ...hashMap, [layer.layerId]: layer }),
    {}
  );

  const handleCursorUpdate = useActiveCursor(chartsActiveCursorService, chartRef, {
    datatables: filteredLayers.map(({ table }) => table),
  });

  const dataLayers: CommonXYDataLayerConfig[] = filteredLayers.filter(isDataLayer);
  const formattedDatatables = useMemo(
    () => getFormattedTablesByLayers(dataLayers, formatFactory),
    [dataLayers, formatFactory]
  );

  if (dataLayers.length === 0) {
    const icon: IconType = getIconForSeriesType(getDataLayers(layers)?.[0]);
    return <EmptyPlaceholder className="xyChart__empty" icon={icon} />;
  }

  // use formatting hint of first x axis column to format ticks
  const xAxisColumn = dataLayers[0]?.table.columns.find(({ id }) => id === dataLayers[0].xAccessor);

  const xAxisFormatter = formatFactory(xAxisColumn && getFormat(xAxisColumn.meta));

  // This is a safe formatter for the xAccessor that abstracts the knowledge of already formatted layers
  const safeXAccessorLabelRenderer = (value: unknown): string =>
    xAxisColumn && formattedDatatables[dataLayers[0]?.layerId]?.formattedColumns[xAxisColumn.id]
      ? String(value)
      : String(xAxisFormatter.convert(value));

  const chartHasMoreThanOneSeries =
    filteredLayers.length > 1 ||
    filteredLayers.some((layer) => layer.accessors.length > 1) ||
    filteredLayers.some((layer) => isDataLayer(layer) && layer.splitAccessor);
  const shouldRotate = isHorizontalChart(dataLayers);

  const yAxesConfiguration = getAxesConfiguration(
    filteredLayers,
    shouldRotate,
    axes,
    formatFactory
  );

  const xTitle = xAxisConfig?.title || (xAxisColumn && xAxisColumn.name);

  const filteredBarLayers = dataLayers.filter(({ seriesType }) => seriesType === SeriesTypes.BAR);

  const chartHasMoreThanOneBarSeries =
    filteredBarLayers.length > 1 ||
    filteredBarLayers.some((layer) => layer.accessors.length > 1) ||
    filteredBarLayers.some((layer) => isDataLayer(layer) && layer.splitAccessor);

  const isTimeViz = Boolean(dataLayers.every((l) => l.xScaleType === 'time'));
  const isHistogramViz = dataLayers.every((l) => l.isHistogram);

  const { baseDomain: rawXDomain, extendedDomain: xDomain } = getXDomain(
    dataLayers,
    minInterval,
    isTimeViz,
    isHistogramViz
  );

  const yAxesMap = {
    left: yAxesConfiguration.find(({ position }) => position === 'left'),
    right: yAxesConfiguration.find(({ position }) => position === 'right'),
  };

  const axisTitlesVisibilitySettings = {
    yLeft: yAxesMap?.left?.showTitle ?? true,
    yRight: yAxesMap?.right?.showTitle ?? true,
  };
  const tickLabelsVisibilitySettings = {
    yLeft: yAxesMap?.left?.showLabels ?? true,
    yRight: yAxesMap?.right?.showLabels ?? true,
  };

  const getYAxesTitles = (axis: AxisConfiguration) => {
    return (
      axis.title ||
      axis.series
        .map(
          (series) =>
            filteredLayers
              .find(({ layerId }) => series.layer === layerId)
              ?.table.columns.find((column) => column.id === series.accessor)?.name
        )
        .filter((name) => Boolean(name))[0]
    );
  };

  const referenceLineLayers = getReferenceLayers(layers);
  const annotationsLayers = getAnnotationsLayers(layers);
  const firstTable = dataLayers[0]?.table;

  const xColumnId = firstTable?.columns.find((col) => col.id === dataLayers[0]?.xAccessor)?.id;

  const groupedLineAnnotations = getAnnotationsGroupedByInterval(
    annotationsLayers,
    minInterval,
    xColumnId ? firstTable.rows[0]?.[xColumnId] : undefined,
    xAxisFormatter
  );
  const rangeAnnotations = getRangeAnnotations(annotationsLayers);

  const visualConfigs = [
    ...referenceLineLayers
      .flatMap(({ yConfig }) => yConfig)
      .map((config) => ({
        ...config,
        position: getAxisGroupConfig(yAxesConfiguration, config)?.position,
      })),
    ...groupedLineAnnotations,
  ].filter(Boolean);

  const shouldHideDetails = annotationsLayers.length > 0 ? annotationsLayers[0].hide : false;
  const linesPaddings = !shouldHideDetails ? getLinesCausedPaddings(visualConfigs, yAxesMap) : {};

  const getYAxesStyle = (axis: AxisConfiguration) => {
    const tickVisible = axis.showLabels;

    const style = {
      tickLabel: {
        fill: axis.labelColor,
        visible: tickVisible,
        rotation: axis.labelsOrientation,
        padding:
          linesPaddings[axis.position] != null
            ? {
                inner: linesPaddings[axis.position],
              }
            : undefined,
      },
      axisTitle: {
        visible: axis.showTitle,
        // if labels are not visible add the padding to the title
        padding:
          !tickVisible && linesPaddings[axis.position] != null
            ? {
                inner: linesPaddings[axis.position],
              }
            : undefined,
      },
    };
    return style;
  };

  const getYAxisDomain = (axis: GroupsConfiguration[number]) => {
    const extent = axis.extent || {
      mode: 'full',
    };
    const hasBarOrArea = Boolean(
      axis.series.some((series) => {
        const layer = layersById[series.layer];
        if (!(layer && isDataLayer(layer))) {
          return false;
        }

        return layer.seriesType === SeriesTypes.BAR || layer.seriesType === SeriesTypes.AREA;
      })
    );

    const fit = !hasBarOrArea && extent.mode === AxisExtentModes.DATA_BOUNDS;
    const padding = axis.boundsMargin || undefined;

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
      padding,
      includeDataFromIds: referenceLineLayers
        .flatMap((l) =>
          l.yConfig ? l.yConfig.map((yConfig) => ({ layerId: l.layerId, yConfig })) : []
        )
        .filter(({ yConfig }) => axis.series.some((s) => s.accessor === yConfig.forAccessor))
        .map(
          ({ layerId, yConfig }) =>
            `${layerId}-${yConfig.forAccessor}-${yConfig.fill !== 'none' ? 'rect' : 'line'}`
        ),
    };
  };

  const shouldShowValueLabels =
    // No stacked bar charts
    dataLayers.every((layer) => !layer.isStacked) &&
    // No histogram charts
    !isHistogramViz;

  const valueLabelsStyling =
    shouldShowValueLabels &&
    valueLabels !== ValueLabelModes.HIDE &&
    getValueLabelsStyling(shouldRotate);

  const clickHandler: ElementClickListener = ([[geometry, series]]) => {
    // for xyChart series is always XYChartSeriesIdentifier and geometry is always type of GeometryValue
    const xySeries = series as XYChartSeriesIdentifier;
    const xyGeometry = geometry as GeometryValue;

    const layerIndex = dataLayers.findIndex((l) =>
      xySeries.seriesKeys.some((key: string | number) => l.accessors.includes(key.toString()))
    );

    if (layerIndex === -1) {
      return;
    }

    const layer = dataLayers[layerIndex];
    const { table } = layer;

    const xColumn = table.columns.find((col) => col.id === layer.xAccessor);
    const currentXFormatter =
      layer.xAccessor &&
      formattedDatatables[layer.layerId]?.formattedColumns[layer.xAccessor] &&
      xColumn
        ? formatFactory(getFormat(xColumn.meta))
        : xAxisFormatter;

    const rowIndex = table.rows.findIndex((row) => {
      if (layer.xAccessor) {
        if (formattedDatatables[layer.layerId]?.formattedColumns[layer.xAccessor]) {
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
      const splitFormatter = formatFactory(splitColumn && getFormat(splitColumn.meta));

      points.push({
        row: table.rows.findIndex((row) => {
          if (layer.splitAccessor) {
            if (formattedDatatables[layer.layerId]?.formattedColumns[layer.splitAccessor]) {
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
      data: points.map(({ row, column, value }) => ({ row, column, value, table })),
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

    const { table } = dataLayers[0];

    const xAxisColumnIndex = table.columns.findIndex((el) => el.id === dataLayers[0].xAccessor);

    const context: BrushEvent['data'] = { range: [min, max], table, column: xAxisColumnIndex };
    onSelectRange(context);
  };

  const legendInsideParams: LegendPositionConfig = {
    vAlign: legend.verticalAlignment ?? VerticalAlignment.Top,
    hAlign: legend?.horizontalAlignment ?? HorizontalAlignment.Right,
    direction: LayoutDirection.Vertical,
    floating: true,
    floatingColumns: legend?.floatingColumns ?? 1,
  };

  const isHistogramModeEnabled = dataLayers.some(
    ({ isHistogram, seriesType, isStacked }) =>
      isHistogram && (isStacked || seriesType !== SeriesTypes.BAR || !chartHasMoreThanOneBarSeries)
  );

  const shouldUseNewTimeAxis =
    isTimeViz && isHistogramModeEnabled && !useLegacyTimeAxis && !shouldRotate;

  const defaultXAxisPosition = shouldRotate ? Position.Left : Position.Bottom;

  const gridLineStyle = {
    visible: xAxisConfig?.showGridLines,
    strokeWidth: 1,
  };
  const xAxisStyle: RecursivePartial<AxisStyle> = shouldUseNewTimeAxis
    ? {
        ...MULTILAYER_TIME_AXIS_STYLE,
        tickLabel: {
          ...MULTILAYER_TIME_AXIS_STYLE.tickLabel,
          visible: Boolean(xAxisConfig?.showLabels),
          fill: xAxisConfig?.labelColor,
        },
        tickLine: {
          ...MULTILAYER_TIME_AXIS_STYLE.tickLine,
          visible: Boolean(xAxisConfig?.showLabels),
        },
        axisTitle: {
          visible: xAxisConfig?.showTitle,
        },
      }
    : {
        tickLabel: {
          visible: xAxisConfig?.showLabels,
          rotation: xAxisConfig?.labelsOrientation,
          padding: linesPaddings.bottom != null ? { inner: linesPaddings.bottom } : undefined,
          fill: xAxisConfig?.labelColor,
        },
        axisTitle: {
          visible: xAxisConfig?.showTitle,
          padding:
            !xAxisConfig?.showLabels && linesPaddings.bottom != null
              ? { inner: linesPaddings.bottom }
              : undefined,
        },
      };
  const isSplitChart = splitColumnAccessor || splitRowAccessor;
  const splitTable = isSplitChart ? dataLayers[0].table : undefined;

  return (
    <Chart ref={chartRef}>
      <Settings
        onPointerUpdate={handleCursorUpdate}
        externalPointerEvents={{
          tooltip: { visible: syncTooltips, placement: Placement.Right },
        }}
        debugState={window._echDebugStateFlag ?? false}
        showLegend={
          legend.isVisible && !legend.showSingleSeries
            ? chartHasMoreThanOneSeries
            : legend.isVisible
        }
        legendPosition={legend?.isInside ? legendInsideParams : legend.position}
        legendSize={LegendSizeToPixels[legend.legendSize ?? DEFAULT_LEGEND_SIZE]}
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
              { ...tickLabelsVisibilitySettings, x: xAxisConfig?.showLabels },
              { ...axisTitlesVisibilitySettings, x: xAxisConfig?.showTitle },
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
            ? getLegendAction(dataLayers, onClickValue, formatFactory, formattedDatatables)
            : undefined
        }
        showLegendExtra={isHistogramViz && valuesInLegend}
        ariaLabel={args.ariaLabel}
        ariaUseDefaultSummary={!args.ariaLabel}
      />

      <Axis
        id="x"
        position={
          xAxisConfig?.position
            ? getAxisPosition(xAxisConfig?.position, shouldRotate)
            : defaultXAxisPosition
        }
        title={xTitle}
        gridLine={gridLineStyle}
        hide={xAxisConfig?.hide || dataLayers[0]?.hide || !dataLayers[0]?.xAccessor}
        tickFormat={(d) => {
          let value = safeXAccessorLabelRenderer(d) || '';
          if (xAxisConfig?.truncate && value.length > xAxisConfig.truncate) {
            value = `${value.slice(0, xAxisConfig.truncate)}...`;
          }
          return value;
        }}
        style={xAxisStyle}
        showOverlappingLabels={xAxisConfig?.showOverlappingLabels}
        showDuplicatedTicks={xAxisConfig?.showDuplicates}
        timeAxisLayerCount={shouldUseNewTimeAxis ? 3 : 0}
      />
      {isSplitChart && splitTable && (
        <SplitChart
          splitColumnAccessor={splitColumnAccessor}
          splitRowAccessor={splitRowAccessor}
          formatFactory={formatFactory}
          columns={splitTable.columns}
        />
      )}
      {yAxesConfiguration.map((axis) => {
        return (
          <Axis
            key={axis.groupId}
            id={axis.groupId}
            groupId={axis.groupId}
            position={axis.position}
            title={getYAxesTitles(axis)}
            gridLine={{
              visible: axis.showGridLines,
            }}
            hide={axis.hide || dataLayers[0]?.hide}
            tickFormat={(d) => {
              let value = axis.formatter?.convert(d) || '';
              if (axis.truncate && value.length > axis.truncate) {
                value = `${value.slice(0, axis.truncate)}...`;
              }
              return value;
            }}
            style={getYAxesStyle(axis)}
            domain={getYAxisDomain(axis)}
            showOverlappingLabels={axis.showOverlappingLabels}
            showDuplicatedTicks={axis.showDuplicates}
            ticks={5}
          />
        );
      })}

      {!hideEndzones && (
        <XyEndzones
          baseDomain={rawXDomain}
          extendedDomain={xDomain}
          darkMode={darkMode}
          histogramMode={dataLayers.every(
            (layer) =>
              layer.isHistogram &&
              (layer.isStacked || !layer.splitAccessor) &&
              (layer.isStacked ||
                layer.seriesType !== SeriesTypes.BAR ||
                !chartHasMoreThanOneBarSeries)
          )}
        />
      )}

      {dataLayers.length && (
        <DataLayers
          layers={dataLayers}
          endValue={endValue}
          timeZone={timeZone}
          curveType={args.curveType}
          syncColors={syncColors}
          valueLabels={valueLabels}
          fillOpacity={args.fillOpacity}
          formatFactory={formatFactory}
          paletteService={paletteService}
          fittingFunction={fittingFunction}
          emphasizeFitting={emphasizeFitting}
          yAxesConfiguration={yAxesConfiguration}
          shouldShowValueLabels={shouldShowValueLabels}
          formattedDatatables={formattedDatatables}
          chartHasMoreThanOneBarSeries={chartHasMoreThanOneBarSeries}
        />
      )}
      {referenceLineLayers.length ? (
        <ReferenceLineAnnotations
          layers={referenceLineLayers}
          xAxisFormatter={xAxisFormatter}
          yAxesConfiguration={yAxesConfiguration}
          isHorizontal={shouldRotate}
          paddingMap={linesPaddings}
        />
      ) : null}
      {rangeAnnotations.length || groupedLineAnnotations.length ? (
        <Annotations
          rangeAnnotations={rangeAnnotations}
          groupedLineAnnotations={groupedLineAnnotations}
          formatter={xAxisFormatter}
          isHorizontal={shouldRotate}
          paddingMap={linesPaddings}
          isBarChart={filteredBarLayers.length > 0}
          minInterval={minInterval}
          hide={annotationsLayers?.[0].hide}
          outsideDimension={
            rangeAnnotations.length && shouldHideDetails
              ? OUTSIDE_RECT_ANNOTATION_WIDTH_SUGGESTION
              : shouldUseNewTimeAxis
              ? Number(MULTILAYER_TIME_AXIS_STYLE.tickLine?.padding || 0) +
                Number(chartTheme.axes?.tickLabel?.fontSize || 0)
              : Number(chartTheme.axes?.tickLine?.size) || OUTSIDE_RECT_ANNOTATION_WIDTH
          }
        />
      ) : null}
    </Chart>
  );
}
