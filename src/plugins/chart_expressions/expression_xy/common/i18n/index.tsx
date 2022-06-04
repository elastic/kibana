/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const strings = {
  getXYHelp: () =>
    i18n.translate('expressionXY.xyVis.help', {
      defaultMessage: 'An X/Y chart',
    }),
  getMetricHelp: () =>
    i18n.translate('expressionXY.xyVis.logDatatable.metric', {
      defaultMessage: 'Vertical axis',
    }),
  getXAxisHelp: () =>
    i18n.translate('expressionXY.xyVis.logDatatable.x', {
      defaultMessage: 'Horizontal axis',
    }),
  getBreakdownHelp: () =>
    i18n.translate('expressionXY.xyVis.logDatatable.breakDown', {
      defaultMessage: 'Break down by',
    }),
  getReferenceLineHelp: () =>
    i18n.translate('expressionXY.xyVis.logDatatable.breakDown', {
      defaultMessage: 'Break down by',
    }),
  getXTitleHelp: () =>
    i18n.translate('expressionXY.xyVis.xTitle.help', {
      defaultMessage: 'X axis title',
    }),
  getYTitleHelp: () =>
    i18n.translate('expressionXY.xyVis.yLeftTitle.help', {
      defaultMessage: 'Y left axis title',
    }),
  getYRightTitleHelp: () =>
    i18n.translate('expressionXY.xyVis.yRightTitle.help', {
      defaultMessage: 'Y right axis title',
    }),
  getYLeftExtentHelp: () =>
    i18n.translate('expressionXY.xyVis.yLeftExtent.help', {
      defaultMessage: 'Y left axis extents',
    }),
  getYRightExtentHelp: () =>
    i18n.translate('expressionXY.xyVis.yRightExtent.help', {
      defaultMessage: 'Y right axis extents',
    }),
  getYLeftScaleTypeHelp: () =>
    i18n.translate('expressionXY.xyVis.yLeftScaleType.help', {
      defaultMessage: 'The scale type of the left y axis',
    }),
  getYRightScaleTypeHelp: () =>
    i18n.translate('expressionXY.xyVis.yRightScaleType.help', {
      defaultMessage: 'The scale type of the right y axis',
    }),
  getLegendHelp: () =>
    i18n.translate('expressionXY.xyVis.legend.help', {
      defaultMessage: 'Configure the chart legend.',
    }),
  getFittingFunctionHelp: () =>
    i18n.translate('expressionXY.xyVis.fittingFunction.help', {
      defaultMessage: 'Define how missing values are treated',
    }),
  getEndValueHelp: () =>
    i18n.translate('expressionXY.xyVis.endValue.help', {
      defaultMessage: 'End value',
    }),
  getValueLabelsHelp: () =>
    i18n.translate('expressionXY.xyVis.valueLabels.help', {
      defaultMessage: 'Value labels mode',
    }),
  getTickLabelsVisibilitySettingsHelp: () =>
    i18n.translate('expressionXY.xyVis.tickLabelsVisibilitySettings.help', {
      defaultMessage: 'Show x and y axes tick labels',
    }),
  getLabelsOrientationHelp: () =>
    i18n.translate('expressionXY.xyVis.labelsOrientation.help', {
      defaultMessage: 'Defines the rotation of the axis labels',
    }),
  getGridlinesVisibilitySettingsHelp: () =>
    i18n.translate('expressionXY.xyVis.gridlinesVisibilitySettings.help', {
      defaultMessage: 'Show x and y axes gridlines',
    }),
  getAxisTitlesVisibilitySettingsHelp: () =>
    i18n.translate('expressionXY.xyVis.axisTitlesVisibilitySettings.help', {
      defaultMessage: 'Show x and y axes titles',
    }),
  getDataLayerHelp: () =>
    i18n.translate('expressionXY.xyVis.dataLayer.help', {
      defaultMessage: 'Data layer of visual series',
    }),
  getReferenceLinesHelp: () =>
    i18n.translate('expressionXY.xyVis.referenceLines.help', {
      defaultMessage: 'Reference line',
    }),
  getAnnotationLayerHelp: () =>
    i18n.translate('expressionXY.xyVis.annotationLayer.help', {
      defaultMessage: 'Annotation layer',
    }),
  getCurveTypeHelp: () =>
    i18n.translate('expressionXY.xyVis.curveType.help', {
      defaultMessage: 'Define how curve type is rendered for a line chart',
    }),
  getFillOpacityHelp: () =>
    i18n.translate('expressionXY.xyVis.fillOpacity.help', {
      defaultMessage: 'Define the area chart fill opacity',
    }),
  getHideEndzonesHelp: () =>
    i18n.translate('expressionXY.xyVis.hideEndzones.help', {
      defaultMessage: 'Hide endzone markers for partial data',
    }),
  getValuesInLegendHelp: () =>
    i18n.translate('expressionXY.xyVis.valuesInLegend.help', {
      defaultMessage: 'Show values in legend',
    }),
  getAriaLabelHelp: () =>
    i18n.translate('expressionXY.xyVis.ariaLabel.help', {
      defaultMessage: 'Specifies the aria label of the xy chart',
    }),
  getDetailedTooltipHelp: () =>
    i18n.translate('expressionXY.xyVis.detailedTooltip.help', {
      defaultMessage: 'Show detailed tooltip',
    }),
  getShowTooltipHelp: () =>
    i18n.translate('expressionXY.xyVis.showTooltip.help', {
      defaultMessage: 'Show tooltip',
    }),
  getOrderBucketsBySum: () =>
    i18n.translate('expressionXY.xyVis.orderBucketsBySum.help', {
      defaultMessage: 'Order buckets by sum',
    }),
  getAddTimeMakerHelp: () =>
    i18n.translate('expressionXY.xyVis.addTimeMaker.help', {
      defaultMessage: 'Show time marker',
    }),
  getMarkSizeRatioHelp: () =>
    i18n.translate('expressionXY.xyVis.markSizeRatio.help', {
      defaultMessage: 'Specifies the ratio of the dots at the line and area charts',
    }),
  getMinTimeBarIntervalHelp: () =>
    i18n.translate('expressionXY.xyVis.xAxisInterval.help', {
      defaultMessage: 'Specifies the min interval for time bar chart',
    }),
  getSplitColumnAccessorHelp: () =>
    i18n.translate('expressionXY.xyVis.splitColumnAccessor.help', {
      defaultMessage: 'Specifies split column of the xy chart',
    }),
  getSplitRowAccessorHelp: () =>
    i18n.translate('expressionXY.xyVis.splitRowAccessor.help', {
      defaultMessage: 'Specifies split row of the xy chart',
    }),
  getLayersHelp: () =>
    i18n.translate('expressionXY.layeredXyVis.layers.help', {
      defaultMessage: 'Layers of visual series',
    }),
  getDataLayerFnHelp: () =>
    i18n.translate('expressionXY.dataLayer.help', {
      defaultMessage: `Configure a layer in the xy chart`,
    }),
  getHideHelp: () =>
    i18n.translate('expressionXY.dataLayer.hide.help', {
      defaultMessage: 'Show / hide axis',
    }),
  getXAccessorHelp: () =>
    i18n.translate('expressionXY.dataLayer.xAccessor.help', {
      defaultMessage: 'X-axis',
    }),
  getSeriesTypeHelp: () =>
    i18n.translate('expressionXY.dataLayer.seriesType.help', {
      defaultMessage: 'The type of chart to display.',
    }),
  getXScaleTypeHelp: () =>
    i18n.translate('expressionXY.dataLayer.xScaleType.help', {
      defaultMessage: 'The scale type of the x axis',
    }),
  getIsHistogramHelp: () =>
    i18n.translate('expressionXY.dataLayer.isHistogram.help', {
      defaultMessage: 'Whether to layout the chart as a histogram',
    }),
  getSplitAccessorHelp: () =>
    i18n.translate('expressionXY.dataLayer.splitAccessor.help', {
      defaultMessage: 'The column to split by',
    }),
  getAccessorsHelp: () =>
    i18n.translate('expressionXY.dataLayer.accessors.help', {
      defaultMessage: 'The columns to display on the y axis.',
    }),
  getMarkSizeAccessorHelp: () =>
    i18n.translate('expressionXY.dataLayer.markSizeAccessor.help', {
      defaultMessage: 'Mark size accessor',
    }),
  getLineWidthHelp: () =>
    i18n.translate('expressionXY.dataLayer.lineWidth.help', {
      defaultMessage: 'Line width',
    }),
  getShowPointsHelp: () =>
    i18n.translate('expressionXY.dataLayer.showPoints.help', {
      defaultMessage: 'Show points',
    }),
  getPointsRadiusHelp: () =>
    i18n.translate('expressionXY.dataLayer.pointsRadius.help', {
      defaultMessage: 'Points radius',
    }),
  getShowLinesHelp: () =>
    i18n.translate('expressionXY.dataLayer.showLines.help', {
      defaultMessage: 'Show lines between points',
    }),
  getYConfigHelp: () =>
    i18n.translate('expressionXY.dataLayer.yConfig.help', {
      defaultMessage: 'Additional configuration for y axes',
    }),
  getColumnToLabelHelp: () =>
    i18n.translate('expressionXY.layer.columnToLabel.help', {
      defaultMessage: 'JSON key-value pairs of column ID to label',
    }),
  getPaletteHelp: () =>
    i18n.translate('expressionXY.dataLayer.palette.help', {
      defaultMessage: 'Palette',
    }),
  getTableHelp: () =>
    i18n.translate('expressionXY.layers.table.help', {
      defaultMessage: 'Table',
    }),
  getLayerIdHelp: () =>
    i18n.translate('expressionXY.layers.layerId.help', {
      defaultMessage: 'Layer ID',
    }),
  getRLAccessorsHelp: () =>
    i18n.translate('expressionXY.referenceLineLayer.accessors.help', {
      defaultMessage: 'The columns to display on the y axis.',
    }),
  getRLYConfigHelp: () =>
    i18n.translate('expressionXY.referenceLineLayer.yConfig.help', {
      defaultMessage: 'Additional configuration for y axes',
    }),
  getRLHelp: () =>
    i18n.translate('expressionXY.referenceLineLayer.help', {
      defaultMessage: `Configure a reference line in the xy chart`,
    }),
  getYConfigFnHelp: () =>
    i18n.translate('expressionXY.yConfig.help', {
      defaultMessage: `Configure the behavior of a xy chart's y axis metric`,
    }),
  getForAccessorHelp: () =>
    i18n.translate('expressionXY.yConfig.forAccessor.help', {
      defaultMessage: 'The accessor this configuration is for',
    }),
  getAxisModeHelp: () =>
    i18n.translate('expressionXY.yConfig.axisMode.help', {
      defaultMessage: 'The axis mode of the metric',
    }),
  getColorHelp: () =>
    i18n.translate('expressionXY.yConfig.color.help', {
      defaultMessage: 'The color of the series',
    }),
  getAnnotationLayerFnHelp: () =>
    i18n.translate('expressionXY.annotationLayer.help', {
      defaultMessage: `Configure an annotation layer in the xy chart`,
    }),
  getAnnotationLayerHideHelp: () =>
    i18n.translate('expressionXY.annotationLayer.hide.help', {
      defaultMessage: 'Show / hide details',
    }),
  getAnnotationLayerAnnotationsHelp: () =>
    i18n.translate('expressionXY.annotationLayer.annotations.help', {
      defaultMessage: 'Annotations',
    }),
  getReferenceLineNameHelp: () =>
    i18n.translate('expressionXY.referenceLine.name.help', {
      defaultMessage: 'Reference line name',
    }),
  getReferenceLineValueHelp: () =>
    i18n.translate('expressionXY.referenceLine.Value.help', {
      defaultMessage: 'Reference line value',
    }),
};
