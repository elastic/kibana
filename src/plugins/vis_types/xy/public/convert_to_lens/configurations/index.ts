/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position, ScaleType as ECScaleType } from '@elastic/charts';
import {
  SeriesTypes,
  Column,
  XYConfiguration,
  XYDataLayerConfig,
  XYReferenceLineLayerConfig,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import { Vis } from '@kbn/visualizations-plugin/public';
import { Layer } from '..';
import { ChartType } from '../../../common';
import {
  CategoryAxis,
  ChartMode,
  InterpolationMode,
  Scale,
  ScaleType,
  SeriesParam,
  ThresholdLineStyle,
  ValueAxis,
  VisParams,
} from '../../types';
import { getCurveType, getMode, getYAxisPosition } from '../../utils/common';

function getYScaleType(scale?: Scale): XYConfiguration['yLeftScale'] | undefined {
  const type = scale?.type;
  if (type === ScaleType.SquareRoot) {
    return ECScaleType.Sqrt;
  }

  return type;
}

function getXScaleType(xColumn?: Column) {
  if (xColumn?.dataType === 'date') return ECScaleType.Time;

  if (xColumn?.dataType !== 'number') {
    return ECScaleType.Ordinal;
  }

  return ECScaleType.Linear;
}

function getLabelOrientation(data?: CategoryAxis, isTimeChart = false) {
  // lens doesn't support 75 as rotate option, we should use 45 instead
  return -(data?.labels.rotate === 75 ? 45 : data?.labels.rotate ?? (isTimeChart ? 0 : 90));
}

function getExtents(axis: ValueAxis, series: SeriesParam[]) {
  // for area and bar charts we should include 0 to bounds
  const isAssignedToAreaOrBar = series.some(
    (s) => s.valueAxis === axis.id && (s.type === 'histogram' || s.type === 'area')
  );
  return {
    mode: getMode(axis.scale),
    lowerBound:
      axis.scale.min !== null
        ? isAssignedToAreaOrBar && axis.scale.min && axis.scale.min > 0
          ? 0
          : axis.scale.min
        : undefined,
    upperBound:
      axis.scale.max !== null
        ? isAssignedToAreaOrBar && axis.scale.max && axis.scale.max < 0
          ? 0
          : axis.scale.max
        : undefined,
    enforce: true,
  };
}

function getSeriesType(
  type?: ChartType,
  mode?: ChartMode,
  isHorizontal?: boolean,
  isPercentage?: boolean
): XYDataLayerConfig['seriesType'] {
  let seriesType: XYDataLayerConfig['seriesType'] =
    type === 'histogram' ? SeriesTypes.BAR : type ?? SeriesTypes.AREA;

  // only bar chart supports horizontal mode
  if (isHorizontal && seriesType === SeriesTypes.BAR) {
    seriesType = (seriesType + '_horizontal') as XYDataLayerConfig['seriesType'];
  }

  // line percentage should convert to area percentage
  if (isPercentage) {
    seriesType = ((seriesType !== SeriesTypes.LINE ? seriesType : SeriesTypes.AREA) +
      '_percentage') as XYDataLayerConfig['seriesType'];
  }

  // percentage chart should be stacked
  // line stacked should convert to area stacked
  if (isPercentage || mode === 'stacked') {
    seriesType = ((seriesType !== SeriesTypes.LINE ? seriesType : SeriesTypes.AREA) +
      '_stacked') as XYDataLayerConfig['seriesType'];
  }

  return seriesType;
}

function getDataLayers(
  layers: Layer[],
  series: SeriesParam[],
  vis: Vis<VisParams>
): XYDataLayerConfig[] {
  const overwriteColors: Record<string, string> = vis.uiState.get('vis.colors', {});
  return layers.map((layer) => {
    const xColumn = layer.columns.find((c) => c.isBucketed && !c.isSplit);
    const splitAccessor = layer.columns.find(
      (column) => column.isBucketed && column.isSplit
    )?.columnId;
    // as type and mode will be the same for all metrics we can use first to define it
    const firstSeries = series.find((s) => s.data.id === layer.seriesIdsMap[layer.metrics[0]]);
    const isHistogram =
      xColumn?.operationType === 'date_histogram' ||
      (xColumn?.operationType === 'range' && xColumn.params.type === 'histogram');
    const firstYAxis = (vis.params.valueAxes ?? vis.type.visConfig.defaults.valueAxes).find(
      (axis) => axis.id === firstSeries?.valueAxis
    );
    const isPercentage = firstYAxis?.scale.mode === 'percentage';
    const isHorizontal =
      firstYAxis?.position !== Position.Left && firstYAxis?.position !== Position.Right;
    const seriesType = getSeriesType(
      firstSeries?.type,
      firstSeries?.mode,
      isHorizontal,
      isPercentage
    );

    return {
      layerId: layer.layerId,
      accessors: layer.metrics,
      layerType: 'data',
      seriesType,
      xAccessor: xColumn?.columnId,
      simpleView: false,
      splitAccessor,
      palette: vis.params.palette ?? vis.type.visConfig.defaults.palette,
      yConfig: layer.metrics.map((metricId) => {
        const serie = series.find((s) => s.data.id === layer.seriesIdsMap[metricId]);
        const yAxis = (vis.params.valueAxes ?? vis.type.visConfig.defaults.valueAxes).find(
          (axis) => axis.id === serie?.valueAxis
        );
        return {
          forAccessor: metricId,
          axisMode: getYAxisPosition(yAxis?.position ?? 'left'),
          color:
            !splitAccessor && serie?.data.label ? overwriteColors[serie?.data.label] : undefined,
        };
      }),
      xScaleType: getXScaleType(xColumn),
      isHistogram,
      collapseFn: layer.collapseFn,
    };
  });
}

function getReferenceLineLayers(
  layers: Layer[],
  vis: Vis<VisParams>
): XYReferenceLineLayerConfig[] {
  const thresholdLineConfig = vis.params.thresholdLine ?? vis.type.visConfig.defaults.thresholdLine;
  // threshold line is always assigned to the first value axis
  const yAxis = (vis.params.valueAxes ?? vis.type.visConfig.defaults.valueAxes)[0];
  return layers.map((layer) => {
    return {
      layerType: 'referenceLine',
      layerId: layer.layerId,
      accessors: layer.metrics,
      yConfig: layer.metrics.map((metricId) => {
        return {
          forAccessor: metricId,
          axisMode: getYAxisPosition(yAxis?.position ?? 'left'),
          color: thresholdLineConfig.color,
          lineWidth: thresholdLineConfig.width !== null ? thresholdLineConfig.width : undefined,
          lineStyle:
            thresholdLineConfig.style === ThresholdLineStyle.DotDashed ||
            thresholdLineConfig.style === ThresholdLineStyle.Full
              ? 'solid'
              : thresholdLineConfig.style,
        };
      }),
    };
  });
}

export const getConfiguration = (
  layers: Layer[],
  series: SeriesParam[],
  vis: Vis<VisParams>
): XYConfiguration => {
  const legendDisplayFromUiState = vis.uiState.get('vis.legendOpen') ?? true;
  const yRightAxis = (vis.params.valueAxes ?? vis.type.visConfig.defaults.valueAxes).find(
    (axis) => getYAxisPosition(axis.position) === Position.Right
  );
  const yLeftAxis = (vis.params.valueAxes ?? vis.type.visConfig.defaults.valueAxes).find(
    (axis) => getYAxisPosition(axis.position) === Position.Left
  );
  // as we have only one x-axis
  const xAxis = (vis.params.categoryAxes ?? vis.type.visConfig.defaults.categoryAxes)[0];
  const axisTitlesVisibilitySettings = {
    x: xAxis.show,
    yLeft: yLeftAxis?.show ?? true,
    yRight: yRightAxis?.show ?? true,
  };
  const xColumn = layers[0].columns.find((c) => c.isBucketed && !c.isSplit);
  const isTimeChart = xColumn?.operationType === 'date_histogram';
  const fittingFunction = vis.params.fittingFunction ?? vis.type.visConfig.defaults.fittingFunction;
  return {
    layers: [
      ...getDataLayers(
        layers.filter((l) => !l.isReferenceLineLayer),
        series,
        vis
      ),
      ...getReferenceLineLayers(
        layers.filter((l) => l.isReferenceLineLayer),
        vis
      ),
    ],
    legend: {
      isVisible:
        legendDisplayFromUiState && (vis.params.addLegend ?? vis.type.visConfig.defaults.addLegend),
      position: vis.params.legendPosition ?? vis.type.visConfig.defaults.legendPosition,
      legendSize: vis.params.legendSize ?? vis.type.visConfig.defaults.legendSize,
      shouldTruncate: vis.params.truncateLegend ?? vis.type.visConfig.defaults.truncateLegend,
      maxLines: vis.params.maxLegendLines ?? vis.type.visConfig.defaults.maxLegendLines,
      showSingleSeries: true,
    },
    fittingFunction: fittingFunction
      ? fittingFunction[0].toUpperCase() + fittingFunction.slice(1)
      : undefined,
    fillOpacity: vis.params.fillOpacity ?? vis.type.visConfig.defaults.fillOpacity,
    gridlinesVisibilitySettings: {
      x: vis.params.grid.categoryLines ?? vis.type.visConfig.defaults.grid?.categoryLines,
      yLeft:
        (vis.params.grid.valueAxis ?? vis.type.visConfig.defaults.grid?.valueAxis) ===
        yLeftAxis?.id,
      yRight:
        (vis.params.grid.valueAxis ?? vis.type.visConfig.defaults.grid?.valueAxis) ===
        yRightAxis?.id,
    },
    axisTitlesVisibilitySettings,
    tickLabelsVisibilitySettings: {
      x: axisTitlesVisibilitySettings.x && (xAxis.labels.show ?? true),
      yLeft: axisTitlesVisibilitySettings.yLeft && (yLeftAxis?.labels.show ?? true),
      yRight: axisTitlesVisibilitySettings.yRight && (yRightAxis?.labels.show ?? true),
    },
    labelsOrientation: {
      x: getLabelOrientation(xAxis, isTimeChart),
      yLeft: getLabelOrientation(yLeftAxis),
      yRight: getLabelOrientation(yRightAxis),
    },
    yLeftScale: getYScaleType(yLeftAxis?.scale) ?? ECScaleType.Linear,
    yRightScale: getYScaleType(yRightAxis?.scale) ?? ECScaleType.Linear,
    yLeftExtent: yLeftAxis?.scale ? getExtents(yLeftAxis, series) : undefined,
    yRightExtent: yRightAxis?.scale ? getExtents(yRightAxis, series) : undefined,
    yTitle: yLeftAxis?.title.text,
    yRightTitle: yRightAxis?.title.text,
    xTitle: xAxis.title.text,
    valueLabels:
      vis.params.labels.show ?? vis.type.visConfig.defaults.labels?.show ? 'show' : 'hide',
    valuesInLegend: Boolean(vis.params.labels.show ?? vis.type.visConfig.defaults.labels?.show),
    showCurrentTimeMarker: isTimeChart
      ? Boolean(vis.params.addTimeMarker ?? vis.type.visConfig.defaults.addTimeMarker)
      : undefined,
    curveType: getCurveType(
      series[0]?.interpolate === InterpolationMode.StepAfter
        ? InterpolationMode.Linear
        : series[0]?.interpolate
    ),
  };
};
