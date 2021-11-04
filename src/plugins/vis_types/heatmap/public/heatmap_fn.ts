/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  ExpressionFunctionDefinition,
  Datatable,
  ExpressionValueRender,
} from '../../../expressions/common';
import { HeatmapVisConfig, HeatmapVisParams } from './types';
import { prepareLogTable, Dimension } from '../../../visualizations/public';

export const vislibHeatmapName = 'heatmap_vis';

export interface HeatmapRendererConfig {
  visData: Datatable;
  visType: string;
  visConfig: Omit<HeatmapVisParams, 'colorSchema' | 'invertColors'>;
  syncColors: boolean;
}

export type ExpressionHeatmapFunction = ExpressionFunctionDefinition<
  typeof vislibHeatmapName,
  Datatable,
  HeatmapVisConfig,
  ExpressionValueRender<HeatmapRendererConfig>
>;
export const createHeatmapVisFn = (): ExpressionHeatmapFunction => ({
  name: vislibHeatmapName,
  type: 'render',
  context: {
    types: ['datatable'],
  },
  help: i18n.translate('visTypeHeatmap.functions.help', {
    defaultMessage: 'Heatmap visualization',
  }),
  args: {
    xDimension: {
      types: ['vis_dimension', 'null'],
      help: i18n.translate('visTypeHeatmap.function.args.xDimension.help', {
        defaultMessage: 'X axis dimension config',
      }),
    },
    yDimension: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeHeatmap.function.args.yDimension.help', {
        defaultMessage: 'Y axis dimension config',
      }),
      multi: true,
    },
    seriesDimension: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeHeatmap.function.args.seriesDimension.help', {
        defaultMessage: 'Series dimension config',
      }),
      multi: true,
    },
    splitRowDimension: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeHeatmap.function.args.splitRowDimension.help', {
        defaultMessage: 'Split by row dimension config',
      }),
      multi: true,
    },
    splitColumnDimension: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeHeatmap.function.args.splitColumnDimension.help', {
        defaultMessage: 'Split by column dimension config',
      }),
      multi: true,
    },
    addTooltip: {
      types: ['boolean'],
      help: i18n.translate('visTypeHeatmap.function.args.addTooltipHelpText', {
        defaultMessage: 'Show tooltip on hover',
      }),
      default: true,
    },
    addLegend: {
      types: ['boolean'],
      help: i18n.translate('visTypeHeatmap.function.args.addLegendHelpText', {
        defaultMessage: 'Show legend chart legend',
      }),
    },
    enableHover: {
      types: ['boolean'],
      help: i18n.translate('visTypeHeatmap.function.args.enableHoverHelpText', {
        defaultMessage: 'Enables hover',
      }),
    },
    legendPosition: {
      types: ['string'],
      help: i18n.translate('visTypeHeatmap.function.args.legendPositionHelpText', {
        defaultMessage: 'Position the legend on top, bottom, left, right of the chart',
      }),
    },
    colorsNumber: {
      types: ['number'],
      help: i18n.translate('visTypeHeatmap.function.args.colorsNumberHelpText', {
        defaultMessage: 'Specify the number of bands dynamically created by the min and max value',
      }),
    },
    setColorRange: {
      types: ['boolean'],
      help: i18n.translate('visTypeHeatmap.function.args.setColorRangeHelpText', {
        defaultMessage: 'When this is enabled. it highlights the ranges of the same color',
      }),
    },
    percentageMode: {
      types: ['boolean'],
      help: i18n.translate('visTypeHeatmap.function.args.percentageModeHelpText', {
        defaultMessage: 'When is on, tooltip and legends appear as percentages',
      }),
    },
    percentageFormatPattern: {
      types: ['string'],
      help: i18n.translate('visTypeHeatmap.function.args.percentageFormatPatternHelpText', {
        defaultMessage: 'The formatter of the percentage mode',
      }),
    },
    isCellLabelVisible: {
      types: ['boolean'],
      help: i18n.translate('visTypeHeatmap.function.args.isCellLabelVisible', {
        defaultMessage: 'Specifies whether or not the cell label is visible.',
      }),
    },
    // maxLegendLines: {
    //   types: ['number'],
    //   help: i18n.translate('visTypeHeatmap.function.args.maxLegendLinesHelpText', {
    //     defaultMessage: 'Defines the number of lines per legend item',
    //   }),
    // },
    palette: {
      types: ['palette', 'system_palette'],
      help: i18n.translate('visTypeHeatmap.function.args.paletteHelpText', {
        defaultMessage: 'Provides colors for the values, based on the bounds',
      }),
      default: '{palette}',
    },
  },
  fn(context, args, handlers) {
    const visConfig = args as unknown as Omit<HeatmapVisParams, 'colorSchema' | 'invertColors'>;

    if (handlers?.inspectorAdapters?.tables) {
      const argsTable: Dimension[] = [
        [
          args.yDimension,
          i18n.translate('visTypeHeatmap.function.dimension.metric', {
            defaultMessage: 'Metric',
          }),
        ],
        [
          args.seriesDimension,
          i18n.translate('visTypeHeatmap.function.adimension.dotSize', {
            defaultMessage: 'Y axis',
          }),
        ],
        [
          args.splitColumnDimension,
          i18n.translate('visTypeHeatmap.function.dimension.splitcolumn', {
            defaultMessage: 'Column split',
          }),
        ],
        [
          args.splitRowDimension,
          i18n.translate('visTypeHeatmap.function.dimension.splitrow', {
            defaultMessage: 'Row split',
          }),
        ],
      ];

      if (args.xDimension) {
        argsTable.push([
          [args.xDimension],
          i18n.translate('visTypeHeatmap.function.adimension.bucket', {
            defaultMessage: 'X axis',
          }),
        ]);
      }

      const logTable = prepareLogTable(context, argsTable);
      handlers.inspectorAdapters.tables.logDatatable('default', logTable);
    }

    return {
      type: 'render',
      as: vislibHeatmapName,
      value: {
        visData: context,
        visConfig,
        syncColors: handlers?.isSyncColorsEnabled?.() ?? false,
        visType: 'heatmap',
        params: {
          listenOnChange: true,
        },
      },
    };
  },
});
