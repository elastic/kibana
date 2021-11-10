/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

// import { prepareLogTable, Dimension } from '../../../../visualizations/common/prepare_log_table';
import { HeatmapExpressionFunctionDefinition } from '../types';
import {
  EXPRESSION_HEATMAP_NAME,
  EXPRESSION_HEATMAP_GRID_NAME,
  EXPRESSION_HEATMAP_LEGEND_NAME,
} from '../constants';

export const heatmapFunction = (): HeatmapExpressionFunctionDefinition => ({
  name: EXPRESSION_HEATMAP_NAME,
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('expressionHeatmap.function.help', {
    defaultMessage: 'Heatmap visualization',
  }),
  args: {
    // used only in legacy heatmap, consider it as @deprecated
    percentageMode: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('expressionHeatmap.function.percentageMode.help', {
        defaultMessage: 'When is on, tooltip and legends appear as percentages.',
      }),
    },
    shape: {
      types: ['string'],
      help: '',
    },
    palette: {
      types: ['palette'],
      help: i18n.translate('expressionHeatmap.function.palette.help', {
        defaultMessage: 'Provides colors for the values, based on the bounds.',
      }),
    },
    legend: {
      types: [EXPRESSION_HEATMAP_LEGEND_NAME],
      help: i18n.translate('expressionHeatmap.function.legendConfig.help', {
        defaultMessage: 'Configure the chart legend.',
      }),
    },
    gridConfig: {
      types: [EXPRESSION_HEATMAP_GRID_NAME],
      help: i18n.translate('expressionHeatmap.function.gridConfig.help', {
        defaultMessage: 'Configure the heatmap layout.',
      }),
    },
    showTooltip: {
      types: ['boolean'],
      help: i18n.translate('expressionHeatmap.function.args.addTooltipHelpText', {
        defaultMessage: 'Show tooltip on hover',
      }),
      default: true,
    },
    enableHover: {
      types: ['boolean'],
      help: i18n.translate('expressionHeatmap.function.args.enableHoverHelpText', {
        defaultMessage:
          'When this is enabled, it highlights the ranges of the same color on legend hover',
      }),
    },
    useDistinctBands: {
      types: ['boolean'],
      help: i18n.translate('visTypeHeatmap.function.args.useDistinctBandsHelpText', {
        defaultMessage: 'TBD',
      }),
      default: true,
    },
    xAccessor: {
      types: ['string'],
      help: i18n.translate('visTypeHeatmap.function.args.xAccessorHelpText', {
        defaultMessage: 'TBD',
      }),
    },
    yAccessor: {
      types: ['string'],
      help: i18n.translate('visTypeHeatmap.function.args.yAccessorHelpText', {
        defaultMessage: 'TBD',
      }),
    },
    valueAccessor: {
      types: ['string'],
      help: i18n.translate('visTypeHeatmap.function.args.valueAccessorHelpText', {
        defaultMessage: 'TBD',
      }),
    },
  },
  fn(data, args, handlers) {
    // @Todo make it work for lens

    // if (handlers?.inspectorAdapters?.tables) {
    //   const argsTable: Dimension[] = [
    //     [
    //       args.yDimension,
    //       i18n.translate('visTypeHeatmap.function.dimension.metric', {
    //         defaultMessage: 'Metric',
    //       }),
    //     ],
    //     [
    //       args.seriesDimension,
    //       i18n.translate('visTypeHeatmap.function.adimension.dotSize', {
    //         defaultMessage: 'Y axis',
    //       }),
    //     ],
    //     [
    //       args.splitColumnDimension,
    //       i18n.translate('visTypeHeatmap.function.dimension.splitcolumn', {
    //         defaultMessage: 'Column split',
    //       }),
    //     ],
    //     [
    //       args.splitRowDimension,
    //       i18n.translate('visTypeHeatmap.function.dimension.splitrow', {
    //         defaultMessage: 'Row split',
    //       }),
    //     ],
    //   ];

    //   if (args.xDimension) {
    //     argsTable.push([
    //       [args.xDimension],
    //       i18n.translate('visTypeHeatmap.function.adimension.bucket', {
    //         defaultMessage: 'X axis',
    //       }),
    //     ]);
    //   }

    //   const logTable = prepareLogTable(context, argsTable);
    //   handlers.inspectorAdapters.tables.logDatatable('default', logTable);
    // }
    return {
      type: 'render',
      as: EXPRESSION_HEATMAP_NAME,
      value: {
        data,
        args,
      },
    };
  },
});
