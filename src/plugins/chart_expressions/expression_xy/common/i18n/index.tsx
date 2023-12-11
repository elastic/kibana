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
  getSplitRowHelp: () =>
    i18n.translate('expressionXY.xyVis.logDatatable.splitRow', {
      defaultMessage: 'Split rows by',
    }),
  getSplitColumnHelp: () =>
    i18n.translate('expressionXY.xyVis.logDatatable.splitColumn', {
      defaultMessage: 'Split columns by',
    }),
  getMarkSizeHelp: () =>
    i18n.translate('expressionXY.xyVis.logDatatable.markSize', {
      defaultMessage: 'Mark size',
    }),
  getReferenceLineHelp: () =>
    i18n.translate('expressionXY.xyVis.logDatatable.breakDown', {
      defaultMessage: 'Break down by',
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
  getXAxisConfigHelp: () =>
    i18n.translate('expressionXY.xyVis.xAxisConfig.help', {
      defaultMessage: 'Specifies x-axis config',
    }),
  getyAxisConfigsHelp: () =>
    i18n.translate('expressionXY.xyVis.yAxisConfigs.help', {
      defaultMessage: 'Specifies y-axes configs',
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
  getMinBarHeightHelp: () =>
    i18n.translate('expressionXY.xyVis.minBarHeight.help', {
      defaultMessage: 'Specifies the min bar height in pixels for bar chart',
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
  getSimpleView: () =>
    i18n.translate('expressionXY.dataLayer.simpleView.help', {
      defaultMessage: 'Show / hide details',
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
  getIsStackedHelp: () =>
    i18n.translate('expressionXY.dataLayer.isStacked.help', {
      defaultMessage: 'Layout of the chart in stacked mode',
    }),
  getIsPercentageHelp: () =>
    i18n.translate('expressionXY.dataLayer.isPercentage.help', {
      defaultMessage: 'Whether to layout the chart has percentage mode',
    }),
  getIsHorizontalHelp: () =>
    i18n.translate('expressionXY.dataLayer.isHorizontal.help', {
      defaultMessage: 'Layout of the chart is horizontal',
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
  getDecorationsHelp: () =>
    i18n.translate('expressionXY.dataLayer.decorations.help', {
      defaultMessage: 'Additional decoration for data',
    }),
  getColumnToLabelHelp: () =>
    i18n.translate('expressionXY.layer.columnToLabel.help', {
      defaultMessage: 'JSON key-value pairs of column ID to label',
    }),
  getPaletteHelp: () =>
    i18n.translate('expressionXY.dataLayer.palette.help', {
      defaultMessage: 'Palette',
    }),
  getColorMappingHelp: () =>
    i18n.translate('expressionXY.layer.colorMapping.help', {
      defaultMessage: 'JSON key-value pairs of the color mapping model',
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
  getRLDecorationConfigHelp: () =>
    i18n.translate('expressionXY.referenceLineLayer.decorationConfig.help', {
      defaultMessage: 'Additional decoration for reference line',
    }),
  getRLHelp: () =>
    i18n.translate('expressionXY.referenceLineLayer.help', {
      defaultMessage: `Configure a reference line in the xy chart`,
    }),
  getForAccessorHelp: () =>
    i18n.translate('expressionXY.decorationConfig.forAccessor.help', {
      defaultMessage: 'The accessor this configuration is for',
    }),
  getColorHelp: () =>
    i18n.translate('expressionXY.decorationConfig.color.help', {
      defaultMessage: 'The color of the series',
    }),
  getAxisIdHelp: () =>
    i18n.translate('expressionXY.decorationConfig.axisId.help', {
      defaultMessage: 'Id of axis',
    }),
  getAnnotationLayerFnHelp: () =>
    i18n.translate('expressionXY.annotationLayer.help', {
      defaultMessage: `Configure an annotation layer in the xy chart`,
    }),
  getAnnotationLayerSimpleViewHelp: () =>
    i18n.translate('expressionXY.annotationLayer.simpleView.help', {
      defaultMessage: 'Show / hide details',
    }),
  getAnnotationLayerAnnotationsHelp: () =>
    i18n.translate('expressionXY.annotationLayer.annotations.help', {
      defaultMessage: 'Annotations',
    }),
  getXAxisConfigFnHelp: () =>
    i18n.translate('expressionXY.xAxisConfigFn.help', {
      defaultMessage: `Configure the xy chart's x-axis config`,
    }),
  getYAxisConfigFnHelp: () =>
    i18n.translate('expressionXY.yAxisConfigFn.help', {
      defaultMessage: `Configure the xy chart's y-axis config`,
    }),
  getAxisModeHelp: () =>
    i18n.translate('expressionXY.axisConfig.mode.help', {
      defaultMessage: 'Scale mode. Can be normal, percentage, wiggle or silhouette',
    }),
  getAxisBoundsMarginHelp: () =>
    i18n.translate('expressionXY.axisConfig.boundsMargin.help', {
      defaultMessage: 'Margin of bounds',
    }),
  getAxisExtentHelp: () =>
    i18n.translate('expressionXY.axisConfig.extent.help', {
      defaultMessage: 'Axis extents',
    }),
  getAxisScaleTypeHelp: () =>
    i18n.translate('expressionXY.axisConfig.scaleType.help', {
      defaultMessage: 'The scale type of the axis',
    }),
  getAxisTitleHelp: () =>
    i18n.translate('expressionXY.axisConfig.title.help', {
      defaultMessage: 'Title of axis',
    }),
  getAxisPositionHelp: () =>
    i18n.translate('expressionXY.axisConfig.position.help', {
      defaultMessage: 'Position of axis',
    }),
  getAxisHideHelp: () =>
    i18n.translate('expressionXY.axisConfig.hide.help', {
      defaultMessage: 'Hide the axis',
    }),
  getAxisLabelColorHelp: () =>
    i18n.translate('expressionXY.axisConfig.labelColor.help', {
      defaultMessage: 'Color of the axis labels',
    }),
  getAxisShowOverlappingLabelsHelp: () =>
    i18n.translate('expressionXY.axisConfig.showOverlappingLabels.help', {
      defaultMessage: 'Show overlapping labels',
    }),
  getAxisShowDuplicatesHelp: () =>
    i18n.translate('expressionXY.axisConfig.showDuplicates.help', {
      defaultMessage: 'Show duplicated ticks',
    }),
  getAxisShowGridLinesHelp: () =>
    i18n.translate('expressionXY.axisConfig.showGridLines.help', {
      defaultMessage: 'Specifies whether or not the gridlines of the axis are visible',
    }),
  getAxisLabelsOrientationHelp: () =>
    i18n.translate('expressionXY.axisConfig.labelsOrientation.help', {
      defaultMessage: 'Specifies the labels orientation of the axis',
    }),
  getAxisShowLabelsHelp: () =>
    i18n.translate('expressionXY.axisConfig.showLabels.help', {
      defaultMessage: 'Show labels',
    }),
  getAxisShowTitleHelp: () =>
    i18n.translate('expressionXY.axisConfig.showTitle.help', {
      defaultMessage: 'Show title of the axis',
    }),
  getAxisTruncateHelp: () =>
    i18n.translate('expressionXY.axisConfig.truncate.help', {
      defaultMessage: 'The number of symbols before truncating',
    }),
  getReferenceLineNameHelp: () =>
    i18n.translate('expressionXY.referenceLine.name.help', {
      defaultMessage: 'Reference line name',
    }),
  getReferenceLineValueHelp: () =>
    i18n.translate('expressionXY.referenceLine.Value.help', {
      defaultMessage: 'Reference line value',
    }),
  getTimeLabel: () =>
    i18n.translate('expressionXY.annotation.time', {
      defaultMessage: 'Time',
    }),
  getLabelLabel: () =>
    i18n.translate('expressionXY.annotation.label', {
      defaultMessage: 'Label',
    }),
};
