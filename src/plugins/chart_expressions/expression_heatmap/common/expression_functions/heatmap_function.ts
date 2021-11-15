/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { DatatableColumn } from '../../../../expressions/public';
import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { prepareLogTable, Dimension } from '../../../../visualizations/common/prepare_log_table';
import { HeatmapExpressionFunctionDefinition } from '../types';
import {
  EXPRESSION_HEATMAP_NAME,
  EXPRESSION_HEATMAP_GRID_NAME,
  EXPRESSION_HEATMAP_LEGEND_NAME,
} from '../constants';

const convertToVisDimension = (columns: DatatableColumn[], accessor: string) => {
  const column = columns.find((c) => c.id === accessor);
  if (!column) return;
  return {
    accessor: column.id,
    format: column.meta.params,
    type: 'vis_dimension',
  } as unknown as ExpressionValueVisDimension;
};

const prepareHeatmapLogTable = (
  columns: DatatableColumn[],
  accessor: string | ExpressionValueVisDimension,
  table: Dimension[],
  label: string
) => {
  const dimension =
    typeof accessor === 'string' ? convertToVisDimension(columns, accessor) : accessor;
  if (dimension) {
    table.push([[dimension], label]);
  }
};

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
    highlightInHover: {
      types: ['boolean'],
      help: i18n.translate('expressionHeatmap.function.args.highlightInHoverHelpText', {
        defaultMessage:
          'When this is enabled, it highlights the ranges of the same color on legend hover',
      }),
    },
    useDistinctBands: {
      types: ['boolean'],
      help: i18n.translate('expressionHeatmap.function.args.useDistinctBandsHelpText', {
        defaultMessage: 'If is set to false, the end value of the bands will be infinite',
      }),
      default: false,
    },
    xAccessor: {
      types: ['string', 'vis_dimension'],
      help: i18n.translate('expressionHeatmap.function.args.xAccessorHelpText', {
        defaultMessage: 'The id of the x axis column as string or the number of the table index',
      }),
    },
    yAccessor: {
      types: ['string', 'vis_dimension'],

      help: i18n.translate('expressionHeatmap.function.args.yAccessorHelpText', {
        defaultMessage: 'The id of the y axis column as string or the number of the table index',
      }),
    },
    valueAccessor: {
      types: ['string', 'vis_dimension'],

      help: i18n.translate('expressionHeatmap.function.args.valueAccessorHelpText', {
        defaultMessage: 'The id of the value column as string or the number of the table index',
      }),
    },
    splitRowAccessor: {
      types: ['string', 'vis_dimension'],

      help: i18n.translate('expressionHeatmap.function.args.splitRowAccessorHelpText', {
        defaultMessage: 'The id of the split row as string or the number of the table index',
      }),
    },
    splitColumnAccessor: {
      types: ['string', 'vis_dimension'],

      help: i18n.translate('expressionHeatmap.function.args.splitColumnAccessorHelpText', {
        defaultMessage: 'The id of the split column as string or the number of the table index',
      }),
    },
  },
  fn(data, args, handlers) {
    if (handlers?.inspectorAdapters?.tables) {
      const argsTable: Dimension[] = [];
      if (args.valueAccessor) {
        prepareHeatmapLogTable(
          data.columns,
          args.valueAccessor,
          argsTable,
          i18n.translate('expressionHeatmap.function.dimension.metric', {
            defaultMessage: 'Metric',
          })
        );
      }
      if (args.yAccessor) {
        prepareHeatmapLogTable(
          data.columns,
          args.yAccessor,
          argsTable,
          i18n.translate('expressionHeatmap.function.dimension.yaxis', {
            defaultMessage: 'Y axis',
          })
        );
      }
      if (args.xAccessor) {
        prepareHeatmapLogTable(
          data.columns,
          args.xAccessor,
          argsTable,
          i18n.translate('expressionHeatmap.function.dimension.xaxis', {
            defaultMessage: 'X axis',
          })
        );
      }
      if (args.splitRowAccessor) {
        prepareHeatmapLogTable(
          data.columns,
          args.splitRowAccessor,
          argsTable,
          i18n.translate('expressionHeatmap.function.dimension.splitRow', {
            defaultMessage: 'Split by row',
          })
        );
      }
      if (args.splitColumnAccessor) {
        prepareHeatmapLogTable(
          data.columns,
          args.splitColumnAccessor,
          argsTable,
          i18n.translate('expressionHeatmap.function.dimension.splitColumn', {
            defaultMessage: 'Split by column',
          })
        );
      }
      const logTable = prepareLogTable(data, argsTable);
      handlers.inspectorAdapters.tables.logDatatable('default', logTable);
    }
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
