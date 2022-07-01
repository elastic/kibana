/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import {
  Chart,
  Settings,
  Axis,
  Position,
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
  TooltipType,
  Placement,
  Direction,
  XYChartElementEvent,
} from '@elastic/charts';
import { IconType } from '@elastic/eui';
import { PaletteRegistry } from '@kbn/coloring';
import { RenderMode } from '@kbn/expressions-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { ChartsPluginSetup, ChartsPluginStart, useActiveCursor } from '@kbn/charts-plugin/public';
import { MULTILAYER_TIME_AXIS_STYLE } from '@kbn/charts-plugin/common';
import {
  getAccessorByDimension,
  getColumnByAccessor,
} from '@kbn/visualizations-plugin/common/utils';
import {
  DEFAULT_LEGEND_SIZE,
  LegendSizeToPixels,
} from '@kbn/visualizations-plugin/common/constants';
import type { FilterEvent, BrushEvent, FormatFactory } from '../types';
import { isTimeChart } from '../../common/helpers';
import type {
  CommonXYDataLayerConfig,
  ReferenceLineDecorationConfig,
  ExtendedReferenceLineDecorationConfig,
  XYChartProps,
  AxisExtentConfigResult,
} from '../../common/types';
import {
  isHorizontalChart,
  getAnnotationsLayers,
  getDataLayers,
  AxisConfiguration,
  getAxisPosition,
  getFormattedTablesByLayers,
  getLayersFormats,
  getLayersTitles,
  isReferenceLineDecorationConfig,
  getFilteredLayers,
  getReferenceLayers,
  isDataLayer,
  getAxesConfiguration,
  GroupsConfiguration,
  getLinesCausedPaddings,
  validateExtent,
  Series,
  getOriginalAxisPosition,
} from '../helpers';
import { getXDomain, XyEndzones } from './x_domain';
import { getLegendAction } from './legend_action';
import {
  ReferenceLines,
  computeChartMargins,
  getAxisGroupForReferenceLine,
} from './reference_lines';
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
import { AxisExtentModes, SeriesTypes, ValueLabelModes, XScaleTypes } from '../../common/constants';
import { DataLayers } from './data_layers';
import { Tooltip } from './tooltip';
import { XYCurrentTime } from './xy_current_time';

import './xy_chart.scss';
import { TooltipHeader } from './tooltip';

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
  data: DataPublicPluginStart;
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
  renderComplete: () => void;
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
  data,
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
  renderComplete,
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
    yAxisConfigs,
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

  const onRenderChange = useCallback(
    (isRendered: boolean = true) => {
      if (isRendered) {
        renderComplete();
      }
    },
    [renderComplete]
  );

  const dataLayers: CommonXYDataLayerConfig[] = filteredLayers.filter(isDataLayer);
  const formattedDatatables = useMemo(
    () => getFormattedTablesByLayers(dataLayers, formatFactory),
    [dataLayers, formatFactory]
  );

  const fieldFormats = useMemo(
    () => getLayersFormats(dataLayers, { splitColumnAccessor, splitRowAccessor }),
    [dataLayers, splitColumnAccessor, splitRowAccessor]
  );

  if (dataLayers.length === 0) {
    const icon: IconType = getIconForSeriesType(getDataLayers(layers)?.[0]);
    return (
      <EmptyPlaceholder className="xyChart__empty" icon={icon} renderComplete={onRenderChange} />
    );
  }

  // use formatting hint of first x axis column to format ticks
  const xAxisColumn = dataLayers[0].xAccessor
    ? getColumnByAccessor(dataLayers[0].xAccessor, dataLayers[0]?.table.columns)
    : undefined;

  const xAxisFormatter = formatFactory(
    xAxisColumn?.id ? fieldFormats[dataLayers[0].layerId].xAccessors[xAxisColumn?.id] : undefined
  );

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
    dataLayers,
    shouldRotate,
    formatFactory,
    fieldFormats,
    yAxisConfigs
  );

  const axesConfiguration = getAxesConfiguration(
    dataLayers,
    shouldRotate,
    formatFactory,
    fieldFormats,
    [...(yAxisConfigs ?? []), ...(xAxisConfig ? [xAxisConfig] : [])]
  );

  const xTitle = xAxisConfig?.title || (xAxisColumn && xAxisColumn.name);
  const yAxesMap = {
    left: yAxesConfiguration.find(
      ({ position }) => position === getAxisPosition(Position.Left, shouldRotate)
    ),
    right: yAxesConfiguration.find(
      ({ position }) => position === getAxisPosition(Position.Right, shouldRotate)
    ),
  };

  const titles = getLayersTitles(
    dataLayers,
    { splitColumnAccessor, splitRowAccessor },
    { xTitle },
    yAxesConfiguration
  );

  const filteredBarLayers = dataLayers.filter(({ seriesType }) => seriesType === SeriesTypes.BAR);

  const chartHasMoreThanOneBarSeries =
    filteredBarLayers.length > 1 ||
    filteredBarLayers.some((layer) => layer.accessors.length > 1) ||
    filteredBarLayers.some((layer) => isDataLayer(layer) && layer.splitAccessor);

  const isTimeViz = isTimeChart(dataLayers);

  const defaultXScaleType = isTimeViz ? XScaleTypes.TIME : XScaleTypes.ORDINAL;

  const isHistogramViz = dataLayers.every((l) => l.isHistogram);

  const { baseDomain: rawXDomain, extendedDomain: xDomain } = getXDomain(
    data.datatableUtilities,
    dataLayers,
    minInterval,
    isTimeViz,
    isHistogramViz,
    xAxisConfig?.extent
  );

  const axisTitlesVisibilitySettings = {
    yLeft: yAxesMap?.left?.showTitle ?? true,
    yRight: yAxesMap?.right?.showTitle ?? true,
  };
  const tickLabelsVisibilitySettings = {
    yLeft: yAxesMap?.left?.showLabels ?? true,
    yRight: yAxesMap?.right?.showLabels ?? true,
  };

  const getYAxesTitles = (axisSeries: Series[]) => {
    return axisSeries
      .map(({ layer, accessor }) => titles?.[layer]?.yTitles?.[accessor])
      .find((name) => Boolean(name));
  };

  const referenceLineLayers = getReferenceLayers(layers);

  const annotationsLayers = getAnnotationsLayers(layers);
  const firstTable = dataLayers[0]?.table;

  const columnId = dataLayers[0]?.xAccessor
    ? getColumnByAccessor(dataLayers[0]?.xAccessor, firstTable.columns)?.id
    : null;

  const groupedLineAnnotations = getAnnotationsGroupedByInterval(
    annotationsLayers,
    minInterval,
    columnId ? firstTable.rows[0]?.[columnId] : undefined,
    xAxisFormatter
  );
  const rangeAnnotations = getRangeAnnotations(annotationsLayers);

  const visualConfigs = [
    ...referenceLineLayers
      .flatMap<ReferenceLineDecorationConfig | ExtendedReferenceLineDecorationConfig | undefined>(
        ({ decorations }) => decorations
      )
      .map((config) => ({
        ...config,
        position: config
          ? getAxisGroupForReferenceLine(axesConfiguration, config, shouldRotate)?.position ??
            Position.Left
          : Position.Bottom,
      })),
    ...groupedLineAnnotations,
  ].filter(Boolean);

  const shouldHideDetails = annotationsLayers.length > 0 ? annotationsLayers[0].previewMode : false;
  const linesPaddings = !shouldHideDetails
    ? getLinesCausedPaddings(visualConfigs, yAxesMap, shouldRotate)
    : {};

  const getYAxesStyle = (axis: AxisConfiguration) => {
    const tickVisible = axis.showLabels;
    const position = getOriginalAxisPosition(axis.position, shouldRotate);

    const style = {
      tickLabel: {
        fill: axis.labelColor,
        visible: tickVisible,
        rotation: axis.labelsOrientation,
        padding:
          linesPaddings[position] != null
            ? {
                inner: linesPaddings[position],
              }
            : undefined,
      },
      axisTitle: {
        visible: axis.showTitle,
        // if labels are not visible add the padding to the title
        padding:
          !tickVisible && linesPaddings[position] != null
            ? {
                inner: linesPaddings[position],
              }
            : undefined,
      },
    };
    return style;
  };

  const getYAxisDomain = (axis: GroupsConfiguration[number]) => {
    const extent: AxisExtentConfigResult = axis.extent || {
      type: 'axisExtentConfig',
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
        .flatMap(
          (l) => l.decorations?.map((decoration) => ({ layerId: l.layerId, decoration })) || []
        )
        .filter(({ decoration }) => {
          if (decoration.axisId) {
            return axis.groupId.includes(decoration.axisId);
          }

          return (
            axis.position === getAxisPosition(decoration.position ?? Position.Left, shouldRotate)
          );
        })
        .map(({ layerId, decoration }) =>
          isReferenceLineDecorationConfig(decoration)
            ? `${layerId}-${decoration.value}-${decoration.fill !== 'none' ? 'rect' : 'line'}`
            : `${layerId}-${decoration.forAccessor}-${decoration.fill !== 'none' ? 'rect' : 'line'}`
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

  const clickHandler: ElementClickListener = ([elementEvent]) => {
    // this cast is safe because we are rendering a cartesian chart
    const [xyGeometry, xySeries] = elementEvent as XYChartElementEvent;

    const layerIndex = dataLayers.findIndex((l) =>
      xySeries.seriesKeys.some((key: string | number) =>
        l.accessors.some(
          (accessor) => getAccessorByDimension(accessor, l.table.columns) === key.toString()
        )
      )
    );

    if (layerIndex === -1) {
      return;
    }

    const layer = dataLayers[layerIndex];
    const { table } = layer;

    const xColumn = layer.xAccessor && getColumnByAccessor(layer.xAccessor, table.columns);
    const xAccessor = layer.xAccessor
      ? getAccessorByDimension(layer.xAccessor, table.columns)
      : undefined;

    const xFormat = xColumn ? fieldFormats[layer.layerId].xAccessors[xColumn.id] : undefined;
    const currentXFormatter =
      xAccessor && formattedDatatables[layer.layerId]?.formattedColumns[xAccessor] && xColumn
        ? formatFactory(xFormat)
        : xAxisFormatter;

    const rowIndex = table.rows.findIndex((row) => {
      if (xAccessor) {
        if (formattedDatatables[layer.layerId]?.formattedColumns[xAccessor]) {
          // stringify the value to compare with the chart value
          return currentXFormatter.convert(row[xAccessor]) === xyGeometry.x;
        }
        return row[xAccessor] === xyGeometry.x;
      }
    });

    const points = [
      {
        row: rowIndex,
        column: table.columns.findIndex((col) => col.id === xAccessor),
        value: xAccessor ? table.rows[rowIndex][xAccessor] : xyGeometry.x,
      },
    ];

    if (xySeries.seriesKeys.length > 1) {
      const pointValue = xySeries.seriesKeys[0];
      const splitAccessor = layer.splitAccessor
        ? getAccessorByDimension(layer.splitAccessor, table.columns)
        : undefined;

      const splitFormat = splitAccessor
        ? fieldFormats[layer.layerId].splitSeriesAccessors[splitAccessor]
        : undefined;
      const splitFormatter = formatFactory(splitFormat);

      points.push({
        row: table.rows.findIndex((row) => {
          if (splitAccessor) {
            if (formattedDatatables[layer.layerId]?.formattedColumns[splitAccessor]) {
              return splitFormatter.convert(row[splitAccessor]) === pointValue;
            }
            return row[splitAccessor] === pointValue;
          }
        }),
        column: table.columns.findIndex((col) => col.id === splitAccessor),
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
    const xAccessor =
      dataLayers[0].xAccessor && getAccessorByDimension(dataLayers[0].xAccessor, table.columns);
    const xAxisColumnIndex = table.columns.findIndex((el) => el.id === xAccessor);

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
  const splitColumnId =
    splitColumnAccessor && splitTable
      ? getAccessorByDimension(splitColumnAccessor, splitTable?.columns)
      : undefined;

  const splitRowId =
    splitRowAccessor && splitTable
      ? getAccessorByDimension(splitRowAccessor, splitTable?.columns)
      : undefined;
  const splitLayerFieldFormats = fieldFormats[dataLayers[0].layerId];
  const splitFieldFormats = {
    ...(splitColumnId
      ? { [splitColumnId]: splitLayerFieldFormats.splitColumnAccessors[splitColumnId] }
      : {}),
    ...(splitRowId ? { [splitRowId]: splitLayerFieldFormats.splitRowAccessors[splitRowId] } : {}),
  };

  return (
    <Chart ref={chartRef}>
      <Settings
        onRenderChange={onRenderChange}
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
          markSizeRatio: args.markSizeRatio,
        }}
        baseTheme={chartBaseTheme}
        tooltip={{
          boundary: document.getElementById('app-fixed-viewport') ?? undefined,
          headerFormatter: !args.detailedTooltip
            ? ({ value }) => (
                <TooltipHeader
                  value={value}
                  formatter={safeXAccessorLabelRenderer}
                  xDomain={rawXDomain}
                />
              )
            : undefined,
          customTooltip: args.detailedTooltip
            ? ({ header, values }) => (
                <Tooltip
                  header={header}
                  values={values}
                  titles={titles}
                  fieldFormats={fieldFormats}
                  formatFactory={formatFactory}
                  formattedDatatables={formattedDatatables}
                  splitAccessors={{
                    splitColumnAccessor: splitColumnId,
                    splitRowAccessor: splitRowId,
                  }}
                  xDomain={isTimeViz ? rawXDomain : undefined}
                />
              )
            : undefined,
          type: args.showTooltip ? TooltipType.VerticalCursor : TooltipType.None,
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
        orderOrdinalBinsBy={
          args.orderBucketsBySum
            ? {
                direction: Direction.Descending,
              }
            : undefined
        }
      />
      <XYCurrentTime
        enabled={Boolean(args.addTimeMarker && isTimeViz)}
        isDarkMode={darkMode}
        domain={rawXDomain}
      />

      <Axis
        id="x"
        position={
          xAxisConfig?.position
            ? getOriginalAxisPosition(xAxisConfig?.position, shouldRotate)
            : defaultXAxisPosition
        }
        title={xTitle}
        gridLine={gridLineStyle}
        hide={xAxisConfig?.hide || dataLayers[0]?.previewMode || !dataLayers[0]?.xAccessor}
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
          fieldFormats={splitFieldFormats}
        />
      )}
      {yAxesConfiguration.map((axis) => {
        return (
          <Axis
            key={axis.groupId}
            id={axis.groupId}
            groupId={axis.groupId}
            position={axis.position}
            title={getYAxesTitles(axis.series)}
            gridLine={{
              visible: axis.showGridLines,
            }}
            hide={axis.hide || dataLayers[0]?.previewMode}
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
          titles={titles}
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
          defaultXScaleType={defaultXScaleType}
        />
      )}
      {referenceLineLayers.length ? (
        <ReferenceLines
          layers={referenceLineLayers}
          xAxisFormatter={xAxisFormatter}
          axesConfiguration={axesConfiguration}
          isHorizontal={shouldRotate}
          paddingMap={linesPaddings}
          titles={titles}
          yAxesMap={yAxesMap}
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
          previewMode={annotationsLayers?.[0].previewMode}
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
