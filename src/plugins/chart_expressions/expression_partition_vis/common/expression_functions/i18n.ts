/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const strings = {
  getPieVisFunctionName: () =>
    i18n.translate('expressionPartitionVis.pieVis.function.help', {
      defaultMessage: 'Pie visualization',
    }),
  getMetricArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.metricHelpText', {
      defaultMessage: 'Metric dimensions config',
    }),
  getBucketsArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.bucketsHelpText', {
      defaultMessage: 'Buckets dimensions config',
    }),
  getBucketArgHelp: () =>
    i18n.translate('expressionPartitionVis.waffle.function.args.bucketHelpText', {
      defaultMessage: 'Bucket dimensions config',
    }),
  getSplitColumnArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.splitColumnHelpText', {
      defaultMessage: 'Split by column dimension config',
    }),
  getSplitRowArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.splitRowHelpText', {
      defaultMessage: 'Split by row dimension config',
    }),
  getAddTooltipArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.addTooltipHelpText', {
      defaultMessage: 'Show tooltip on slice hover',
    }),
  getLegendDisplayArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.legendDisplayHelpText', {
      defaultMessage: 'Show legend chart legend',
    }),
  getLegendPositionArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.legendPositionHelpText', {
      defaultMessage: 'Position the legend on top, bottom, left, right of the chart',
    }),
  getLegendSizeArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.legendSizeHelpText', {
      defaultMessage: 'Specifies the legend size in pixels',
    }),
  getNestedLegendArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.nestedLegendHelpText', {
      defaultMessage: 'Show a more detailed legend',
    }),
  getTruncateLegendArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.truncateLegendHelpText', {
      defaultMessage: 'Defines if the legend items will be truncated or not',
    }),
  getMaxLegendLinesArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.maxLegendLinesHelpText', {
      defaultMessage: 'Defines the number of lines per legend item',
    }),
  getDistinctColorsArgHelp: () =>
    i18n.translate('expressionPartitionVis.pieVis.function.args.distinctColorsHelpText', {
      defaultMessage:
        'Maps different color per slice. Slices with the same value have the same color',
    }),
  getIsDonutArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.isDonutHelpText', {
      defaultMessage: 'Displays the pie chart as donut',
    }),
  getRespectSourceOrderArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.respectSourceOrderHelpText', {
      defaultMessage: 'Keeps an order of the elements, returned from the datasource',
    }),
  getStartFromSecondLargestSliceArgHelp: () =>
    i18n.translate(
      'expressionPartitionVis.reusable.function.args.startPlacementWithSecondLargestSliceHelpText',
      {
        defaultMessage: 'Starts placement with the second largest slice',
      }
    ),
  getEmptySizeRatioArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.emptySizeRatioHelpText', {
      defaultMessage: 'Defines donut inner empty area size',
    }),
  getPaletteArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.paletteHelpText', {
      defaultMessage: 'Defines the chart palette name',
    }),
  getLabelsArgHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.args.labelsHelpText', {
      defaultMessage: 'Pie labels config',
    }),
  getShowValuesInLegendArgHelp: () =>
    i18n.translate('expressionPartitionVis.waffle.function.args.showValuesInLegendHelpText', {
      defaultMessage: 'Show values in legend',
    }),
  getAriaLabelHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.functions.args.ariaLabelHelpText', {
      defaultMessage: 'Specifies the aria label of the chart',
    }),

  getSliceSizeHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.dimension.metric', {
      defaultMessage: 'Slice size',
    }),
  getSliceHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.dimension.buckets', {
      defaultMessage: 'Slice',
    }),
  getColumnSplitHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.dimension.splitcolumn', {
      defaultMessage: 'Column split',
    }),
  getRowSplitHelp: () =>
    i18n.translate('expressionPartitionVis.reusable.function.dimension.splitrow', {
      defaultMessage: 'Row split',
    }),
};

export const errors = {
  moreThanNBucketsAreNotSupportedError: (maxLength: number) =>
    i18n.translate('expressionPartitionVis.reusable.function.errors.moreThenNumberBuckets', {
      defaultMessage: 'More than {maxLength} buckets are not supported',
      values: { maxLength },
    }),
  splitRowAndSplitColumnAreSpecifiedError: () =>
    i18n.translate('expressionPartitionVis.reusable.function.errors.splitRowAndColumnSpecified', {
      defaultMessage:
        'A split row and column are specified. Expression is supporting only one of them at once.',
    }),
};
