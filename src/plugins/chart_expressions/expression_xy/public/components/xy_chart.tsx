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
import {
  getColumnByAccessor,
  getAccessorByDimension,
  getFormatByAccessor,
} from '../../../../../plugins/visualizations/common/utils';
import { RenderMode } from '../../../../expressions/common';
import { EmptyPlaceholder } from '../../../../../plugins/charts/public';
import type { FilterEvent, BrushEvent, FormatFactory } from '../types';
import type { SeriesType, XYChartProps } from '../../common/types';
import {
  isHorizontalChart,
  getAnnotationsLayers,
  getDataLayers,
  Series,
  getAreAlreadyFormattedLayersInfo,
} from '../helpers';
import { EventAnnotationServiceType } from '../../../../event_annotation/public';
import {
  ChartsPluginSetup,
  ChartsPluginStart,
  PaletteRegistry,
  useActiveCursor,
} from '../../../../../plugins/charts/public';
import { MULTILAYER_TIME_AXIS_STYLE } from '../../../../../plugins/charts/common';
import {
  getFilteredLayers,
  getReferenceLayers,
  isDataLayer,
  getAxesConfiguration,
  GroupsConfiguration,
  validateExtent,
  computeOverallDataDomain,
  getLinesCausedPaddings,
} from '../helpers';
import { getXDomain, XyEndzones } from './x_domain';
import { getLegendAction } from './legend_action';
import { ReferenceLineAnnotations, computeChartMargins } from './reference_lines';
import { visualizationDefinitions } from '../definitions';
import { CommonXYDataLayerConfigResult, CommonXYLayerConfigResult } from '../../common/types';

import './xy_chart.scss';
import { Annotations, getAnnotationsGroupedByInterval } from './annotations';
import { SeriesTypes } from '../../common/constants';
import { DataLayers } from './data_layers';

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

function getIconForSeriesType(seriesType: SeriesType): IconType {
  return visualizationDefinitions.find((c) => c.id === seriesType)!.icon || 'empty';
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
    const icon: IconType = getIconForSeriesType(
      getDataLayers(layers)?.[0]?.seriesType || SeriesTypes.BAR
    );
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

  const yAxesConfiguration = getAxesConfiguration(filteredLayers, shouldRotate, formatFactory);

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

  const filteredBarLayers = dataLayers.filter((layer) => layer.seriesType.includes('bar'));

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
    left: yAxesConfiguration.find(({ groupId }) => groupId === 'left'),
    right: yAxesConfiguration.find(({ groupId }) => groupId === 'right'),
  };

  const getYAxesTitles = (axisSeries: Series[], groupId: 'right' | 'left') => {
    const yTitle = groupId === 'right' ? args.yRightTitle : args.yTitle;
    return (
      yTitle ||
      axisSeries
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

  const columnId = dataLayers[0]?.xAccessor
    ? getColumnByAccessor(dataLayers[0]?.xAccessor, firstTable.columns)?.id
    : null;

  const groupedAnnotations = getAnnotationsGroupedByInterval(
    annotationsLayers,
    minInterval,
    columnId ? firstTable.rows[0]?.[columnId] : undefined,
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
    } else {
      const axisHasReferenceLine = referenceLineLayers.some(({ yConfig }) =>
        yConfig?.some(({ axisMode }) => axisMode === axis.groupId)
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
          for (const { axisMode, forAccessor } of yConfig || []) {
            if (axis.groupId === axisMode) {
              for (const row of table.rows) {
                const value = row[getAccessorByDimension(forAccessor, table.columns)];
                // keep the 0 in view
                max = Math.max(value, max || 0, 0);
                min = Math.min(value, min || 0, 0);
              }
            }
          }
        }
      }
    }

    return { fit, min, max };
  };

  const shouldShowValueLabels =
    // No stacked bar charts
    dataLayers.every((layer) => !layer.seriesType.includes('stacked')) &&
    // No histogram charts
    !isHistogramViz;

  const valueLabelsStyling =
    shouldShowValueLabels && valueLabels !== 'hide' && getValueLabelsStyling(shouldRotate);

  const clickHandler: ElementClickListener = ([[geometry, series]]) => {
    // for xyChart series is always XYChartSeriesIdentifier and geometry is always type of GeometryValue
    const xySeries = series as XYChartSeriesIdentifier;
    const xyGeometry = geometry as GeometryValue;

    const layerIndex = dataLayers.findIndex((l) =>
      xySeries.seriesKeys.some((key: string | number) => l.accessors.some((accessor) =>
      getAccessorByDimension(accessor, l.table.columns) === key.toString()
    ))
    );

    if (layerIndex === -1) {
      return;
    }

    const layer = dataLayers[layerIndex];
    const { table } = layer;

    const xColumn = layer.xAccessor && getColumnByAccessor(layer.xAccessor, table.columns);
    const xAccessor = layer.xAccessor ? getAccessorByDimension(layer.xAccessor, table.columns) : '';
    const currentXFormatter =
      layer.xAccessor && areLayersAlreadyFormatted[layerIndex]?.[xAccessor] && xColumn
        ? formatFactory(getFormatByAccessor(layer.xAccessor!, table.columns))
        : xAxisFormatter;

    const rowIndex = table.rows.findIndex((row) => {
      if (layer.xAccessor) {
        if (areLayersAlreadyFormatted[layerIndex]?.[xAccessor]) {
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
        : '';

      const splitFormatter = formatFactory(
        layer.splitAccessor ? getFormatByAccessor(layer.splitAccessor, table.columns) : undefined
      );

      points.push({
        row: table.rows.findIndex((row) => {
          if (splitAccessor) {
            if (areLayersAlreadyFormatted[layerIndex]?.[splitAccessor]) {
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

    const { table } = dataLayers[0];
    const xAccessor =
      dataLayers[0].xAccessor && getAccessorByDimension(dataLayers[0].xAccessor, table.columns);
    const xAxisColumnIndex = table.columns.findIndex((el) => el.id === xAccessor);

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

  const isHistogramModeEnabled = dataLayers.some(
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
            ? getLegendAction(dataLayers, onClickValue, formatFactory, areLayersAlreadyFormatted)
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
        hide={dataLayers[0]?.hide || !dataLayers[0]?.xAccessor}
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
            hide={dataLayers[0]?.hide}
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
          histogramMode={dataLayers.every(
            (layer) =>
              layer.isHistogram &&
              (layer.seriesType.includes('stacked') || !layer.splitAccessor) &&
              (layer.seriesType.includes('stacked') ||
                !layer.seriesType.includes('bar') ||
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
