/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EmptySizeRatios, PieVisParams } from '../types/expression_renderers';
import { prepareLogTable } from '../../../../visualizations/common/prepare_log_table';
import { PieVisExpressionFunctionDefinition } from '../types/expression_functions';
import { PIE_LABELS_FUNCTION, PIE_LABELS_VALUE, PIE_VIS_EXPRESSION_NAME } from '../constants';

export const pieVisFunction = (): PieVisExpressionFunctionDefinition => ({
  name: PIE_VIS_EXPRESSION_NAME,
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('expressionPie.pieVis.function.help', {
    defaultMessage: 'Pie visualization',
  }),
  args: {
    metric: {
      types: ['vis_dimension'],
      help: i18n.translate('expressionPie.pieVis.function.args.metricHelpText', {
        defaultMessage: 'Metric dimensions config',
      }),
      required: true,
    },
    buckets: {
      types: ['vis_dimension'],
      help: i18n.translate('expressionPie.pieVis.function.args.bucketsHelpText', {
        defaultMessage: 'Buckets dimensions config',
      }),
      multi: true,
    },
    splitColumn: {
      types: ['vis_dimension'],
      help: i18n.translate('expressionPie.pieVis.function.args.splitColumnHelpText', {
        defaultMessage: 'Split by column dimension config',
      }),
      multi: true,
    },
    splitRow: {
      types: ['vis_dimension'],
      help: i18n.translate('expressionPie.pieVis.function.args.splitRowHelpText', {
        defaultMessage: 'Split by row dimension config',
      }),
      multi: true,
    },
    addTooltip: {
      types: ['boolean'],
      help: i18n.translate('expressionPie.pieVis.function.args.addTooltipHelpText', {
        defaultMessage: 'Show tooltip on slice hover',
      }),
      default: true,
    },
    addLegend: {
      types: ['boolean'],
      help: i18n.translate('expressionPie.pieVis.function.args.addLegendHelpText', {
        defaultMessage: 'Show legend chart legend',
      }),
    },
    legendPosition: {
      types: ['string'],
      help: i18n.translate('expressionPie.pieVis.function.args.legendPositionHelpText', {
        defaultMessage: 'Position the legend on top, bottom, left, right of the chart',
      }),
    },
    nestedLegend: {
      types: ['boolean'],
      help: i18n.translate('expressionPie.pieVis.function.args.nestedLegendHelpText', {
        defaultMessage: 'Show a more detailed legend',
      }),
      default: false,
    },
    truncateLegend: {
      types: ['boolean'],
      help: i18n.translate('expressionPie.pieVis.function.args.truncateLegendHelpText', {
        defaultMessage: 'Defines if the legend items will be truncated or not',
      }),
      default: true,
    },
    maxLegendLines: {
      types: ['number'],
      help: i18n.translate('expressionPie.pieVis.function.args.maxLegendLinesHelpText', {
        defaultMessage: 'Defines the number of lines per legend item',
      }),
    },
    distinctColors: {
      types: ['boolean'],
      help: i18n.translate('expressionPie.pieVis.function.args.distinctColorsHelpText', {
        defaultMessage:
          'Maps different color per slice. Slices with the same value have the same color',
      }),
      default: false,
    },
    isDonut: {
      types: ['boolean'],
      help: i18n.translate('expressionPie.pieVis.function.args.isDonutHelpText', {
        defaultMessage: 'Displays the pie chart as donut',
      }),
      default: false,
    },
    emptySizeRatio: {
      types: ['number'],
      help: i18n.translate('expressionPie.pieVis.function.args.emptySizeRatioHelpText', {
        defaultMessage: 'Defines donut inner empty area size',
      }),
      default: EmptySizeRatios.SMALL,
    },
    palette: {
      types: ['palette', 'system_palette'],
      help: i18n.translate('expressionPie.pieVis.function.args.paletteHelpText', {
        defaultMessage: 'Defines the chart palette name',
      }),
      default: '{palette}',
    },
    labels: {
      types: [PIE_LABELS_VALUE],
      help: i18n.translate('expressionPie.pieVis.function.args.labelsHelpText', {
        defaultMessage: 'Pie labels config',
      }),
      default: `{${PIE_LABELS_FUNCTION}}`,
    },
  },
  fn(context, args, handlers) {
    const visConfig: PieVisParams = {
      ...args,
      palette: args.palette,
      dimensions: {
        metric: args.metric,
        buckets: args.buckets,
        splitColumn: args.splitColumn,
        splitRow: args.splitRow,
      },
    };

    if (handlers?.inspectorAdapters?.tables) {
      const logTable = prepareLogTable(context, [
        [
          [args.metric],
          i18n.translate('expressionPie.pieVis.function.dimension.metric', {
            defaultMessage: 'Slice size',
          }),
        ],
        [
          args.buckets,
          i18n.translate('expressionPie.pieVis.function.dimension.buckets', {
            defaultMessage: 'Slice',
          }),
        ],
        [
          args.splitColumn,
          i18n.translate('expressionPie.pieVis.function.dimension.splitcolumn', {
            defaultMessage: 'Column split',
          }),
        ],
        [
          args.splitRow,
          i18n.translate('expressionPie.pieVis.function.dimension.splitrow', {
            defaultMessage: 'Row split',
          }),
        ],
      ]);
      handlers.inspectorAdapters.tables.logDatatable('default', logTable);
    }

    return {
      type: 'render',
      as: PIE_VIS_EXPRESSION_NAME,
      value: {
        visData: context,
        visConfig,
        syncColors: handlers?.isSyncColorsEnabled?.() ?? false,
        visType: 'pie',
        params: {
          listenOnChange: true,
        },
      },
    };
  },
});
