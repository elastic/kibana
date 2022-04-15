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
} from '@elastic/charts';
import { IconType } from '@elastic/eui';
import { PaletteRegistry } from '@kbn/coloring';
import { RenderMode } from '../../../../expressions/common';
import { EmptyPlaceholder } from '../../../../../plugins/charts/public';
import type { FilterEvent, BrushEvent, FormatFactory } from '../types';
import type { XYChartProps } from '../../common/types';
import { EventAnnotationServiceType } from '../../../../event_annotation/public';
import {
  ChartsPluginSetup,
  ChartsPluginStart,
  useActiveCursor,
} from '../../../../../plugins/charts/public';
import { MULTILAYER_TIME_AXIS_STYLE } from '../../../../../plugins/charts/common';
import {
  isHorizontalChart,
  getAnnotationsLayers,
  getDataLayers,
  AxisConfiguration,
  getAxisPosition,
  getAreAlreadyFormattedLayersInfo,
  getFilteredLayers,
  getReferenceLayers,
  isDataLayer,
  getAxesConfiguration,
  GroupsConfiguration,
  computeOverallDataDomain,
  getLinesCausedPaddings,
  getAxisGroupConfig,
} from '../helpers';
import { getXDomain, XyEndzones } from './x_domain';
import { getLegendAction } from './legend_action';
import { ReferenceLineAnnotations, computeChartMargins } from './reference_lines';
import { visualizationDefinitions } from '../definitions';
import { CommonXYDataLayerConfigResult, CommonXYLayerConfigResult } from '../../common/types';
import { Annotations, getAnnotationsGroupedByInterval } from './annotations';
import { SeriesTypes, ValueLabelModes } from '../../common/constants';
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

function getIconForSeriesType(layer: CommonXYDataLayerConfigResult): IconType {
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
  } = args;
  const chartRef = useRef<Chart>(null);
  const chartTheme = chartsThemeService.useChartsTheme();
  const chartBaseTheme = chartsThemeService.useChartsBaseTheme();
  const darkMode = chartsThemeService.useDarkMode();
  const filteredLayers = getFilteredLayers(layers);
  const layersById = filteredLayers.reduce<Record<string, CommonXYLayerConfigResult>>(
    (hashMap, layer, index) => {
      hashMap[index] = layer;
      return hashMap;
    },
    {}
  );

  const handleCursorUpdate = useActiveCursor(chartsActiveCursorService, chartRef, {
    datatables: layers.map(({ table }) => table),
  });

  if (filteredLayers.length === 0) {
    const icon: IconType = getIconForSeriesType(getDataLayers(layers)?.[0]);
    return <EmptyPlaceholder className="xyChart__empty" icon={icon} />;
  }

  const dataLayers: CommonXYDataLayerConfigResult[] = filteredLayers.filter(isDataLayer);

  // use formatting hint of first x axis column to format ticks
  const xAxisColumn = dataLayers[0]?.table.columns.find(({ id }) => id === dataLayers[0].xAccessor);

  const xAxisFormatter = formatFactory(xAxisColumn && xAxisColumn.meta?.params);
  const areLayersAlreadyFormatted = getAreAlreadyFormattedLayersInfo(dataLayers, formatFactory);

  // This is a safe formatter for the xAccessor that abstracts the knowledge of already formatted layers
  const safeXAccessorLabelRenderer = (value: unknown): string =>
    xAxisColumn && areLayersAlreadyFormatted[0]?.[xAxisColumn.id]
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

  const isTimeViz = Boolean(filteredLayers.every((l) => isDataLayer(l) && l.xScaleType === 'time'));
  const isHistogramViz = filteredLayers.every((l) => isDataLayer(l) && l.isHistogram);

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
            layers[series.layer].table.columns.find((column) => column.id === series.accessor)?.name
        )
        .filter((name) => Boolean(name))[0]
    );
  };

  const referenceLineLayers = getReferenceLayers(layers);
  const annotationsLayers = getAnnotationsLayers(layers);
  const firstTable = dataLayers[0]?.table;

  const xColumnId = firstTable.columns.find((col) => col.id === dataLayers[0]?.xAccessor)?.id;

  const groupedAnnotations = getAnnotationsGroupedByInterval(
    annotationsLayers,
    minInterval,
    xColumnId ? firstTable.rows[0]?.[xColumnId] : undefined,
    xAxisFormatter
  );
  const visualConfigs = [
    ...referenceLineLayers
      .flatMap(({ yConfig }) => yConfig)
      .map((config) => ({
        ...config,
        position: getAxisGroupConfig(yAxesConfiguration, config)?.position,
      })),
    ...groupedAnnotations,
  ].filter(Boolean);

  const linesPaddings = getLinesCausedPaddings(visualConfigs, yAxesMap);

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
    const fit = !hasBarOrArea && extent.mode === 'dataBounds';
    const padding = axis.boundsMargin || undefined;
    let min: number = NaN;
    let max: number = NaN;
    if (extent.mode === 'custom') {
      min = extent.lowerBound ?? NaN;
      max = extent.upperBound ?? NaN;
    } else {
      const axisHasReferenceLine = referenceLineLayers.some(({ yConfig }) =>
        yConfig?.some((config) => Boolean(getAxisGroupConfig([axis], config)))
      );
      if (!fit && axisHasReferenceLine) {
        // Remove this once the chart will support automatic annotation fit for other type of charts
        const { min: computedMin, max: computedMax } = computeOverallDataDomain(
          layers,
          axis.series.map(({ accessor }) => accessor)
        );

        if (computedMin != null && computedMax != null) {
          max = Math.max(computedMax, max || 0);
          min = Math.min(computedMin, min || 0);
        }
        for (const { yConfig, table } of referenceLineLayers) {
          for (const config of yConfig || []) {
            if (Boolean(getAxisGroupConfig([axis], config))) {
              for (const row of table.rows) {
                const value = row[config.forAccessor];
                // keep the 0 in view
                max = Math.max(value, max || 0, 0);
                min = Math.min(value, min || 0, 0);
              }
            }
          }
        }
      }
    }

    return { fit, min, max, padding };
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
      layer.xAccessor && areLayersAlreadyFormatted[layerIndex]?.[layer.xAccessor] && xColumn
        ? formatFactory(xColumn.meta.params)
        : xAxisFormatter;

    const rowIndex = table.rows.findIndex((row) => {
      if (layer.xAccessor) {
        if (areLayersAlreadyFormatted[layerIndex]?.[layer.xAccessor]) {
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
            if (areLayersAlreadyFormatted[layerIndex]?.[layer.splitAccessor]) {
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

  const legendInsideParams = {
    vAlign: legend.verticalAlignment ?? VerticalAlignment.Top,
    hAlign: legend?.horizontalAlignment ?? HorizontalAlignment.Right,
    direction: LayoutDirection.Vertical,
    floating: true,
    floatingColumns: legend?.floatingColumns ?? 1,
  } as LegendPositionConfig;

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
            ? getLegendAction(dataLayers, onClickValue, formatFactory, areLayersAlreadyFormatted)
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
          areLayersAlreadyFormatted={areLayersAlreadyFormatted}
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
