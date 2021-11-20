/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, Datatable, Render } from '../../../expressions/common';
import { PieVisParams, PieVisConfig } from './types';
import { prepareLogTable } from '../../../visualizations/public';

export const vislibPieName = 'pie_vis';

export interface RenderValue {
  visData: Datatable;
  visType: string;
  visConfig: PieVisParams;
  syncColors: boolean;
}

export type VisTypePieExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof vislibPieName,
  Datatable,
  PieVisConfig,
  Render<RenderValue>
>;

export const createPieVisFn = (): VisTypePieExpressionFunctionDefinition => ({
  name: vislibPieName,
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('visTypePie.functions.help', {
    defaultMessage: 'Pie visualization',
  }),
  args: {
    metric: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypePie.function.args.metricHelpText', {
        defaultMessage: 'Metric dimensions config',
      }),
      required: true,
    },
    buckets: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypePie.function.args.bucketsHelpText', {
        defaultMessage: 'Buckets dimensions config',
      }),
      multi: true,
    },
    splitColumn: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypePie.function.args.splitColumnHelpText', {
        defaultMessage: 'Split by column dimension config',
      }),
      multi: true,
    },
    splitRow: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypePie.function.args.splitRowHelpText', {
        defaultMessage: 'Split by row dimension config',
      }),
      multi: true,
    },
    addTooltip: {
      types: ['boolean'],
      help: i18n.translate('visTypePie.function.args.addTooltipHelpText', {
        defaultMessage: 'Show tooltip on slice hover',
      }),
      default: true,
    },
    addLegend: {
      types: ['boolean'],
      help: i18n.translate('visTypePie.function.args.addLegendHelpText', {
        defaultMessage: 'Show legend chart legend',
      }),
    },
    legendPosition: {
      types: ['string'],
      help: i18n.translate('visTypePie.function.args.legendPositionHelpText', {
        defaultMessage: 'Position the legend on top, bottom, left, right of the chart',
      }),
    },
    nestedLegend: {
      types: ['boolean'],
      help: i18n.translate('visTypePie.function.args.nestedLegendHelpText', {
        defaultMessage: 'Show a more detailed legend',
      }),
      default: false,
    },
    truncateLegend: {
      types: ['boolean'],
      help: i18n.translate('visTypePie.function.args.truncateLegendHelpText', {
        defaultMessage: 'Defines if the legend items will be truncated or not',
      }),
      default: true,
    },
    maxLegendLines: {
      types: ['number'],
      help: i18n.translate('visTypePie.function.args.maxLegendLinesHelpText', {
        defaultMessage: 'Defines the number of lines per legend item',
      }),
    },
    distinctColors: {
      types: ['boolean'],
      help: i18n.translate('visTypePie.function.args.distinctColorsHelpText', {
        defaultMessage:
          'Maps different color per slice. Slices with the same value have the same color',
      }),
      default: false,
    },
    isDonut: {
      types: ['boolean'],
      help: i18n.translate('visTypePie.function.args.isDonutHelpText', {
        defaultMessage: 'Displays the pie chart as donut',
      }),
      default: false,
    },
    palette: {
      types: ['string'],
      help: i18n.translate('visTypePie.function.args.paletteHelpText', {
        defaultMessage: 'Defines the chart palette name',
      }),
      default: 'default',
    },
    labels: {
      types: ['pie_labels'],
      help: i18n.translate('visTypePie.function.args.labelsHelpText', {
        defaultMessage: 'Pie labels config',
      }),
    },
  },
  fn(context, args, handlers) {
    const visConfig = {
      ...args,
      palette: {
        type: 'palette',
        name: args.palette,
      },
      dimensions: {
        metric: args.metric,
        buckets: args.buckets,
        splitColumn: args.splitColumn,
        splitRow: args.splitRow,
      },
    } as PieVisParams;

    if (handlers?.inspectorAdapters?.tables) {
      const logTable = prepareLogTable(context, [
        [
          [args.metric],
          i18n.translate('visTypePie.function.dimension.metric', {
            defaultMessage: 'Slice size',
          }),
        ],
        [
          args.buckets,
          i18n.translate('visTypePie.function.adimension.buckets', {
            defaultMessage: 'Slice',
          }),
        ],
        [
          args.splitColumn,
          i18n.translate('visTypePie.function.dimension.splitcolumn', {
            defaultMessage: 'Column split',
          }),
        ],
        [
          args.splitRow,
          i18n.translate('visTypePie.function.dimension.splitrow', {
            defaultMessage: 'Row split',
          }),
        ],
      ]);
      handlers.inspectorAdapters.tables.logDatatable('default', logTable);
    }

    return {
      type: 'render',
      as: vislibPieName,
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
