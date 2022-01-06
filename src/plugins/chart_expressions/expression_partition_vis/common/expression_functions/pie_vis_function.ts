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
import {
  PARTITION_LABELS_FUNCTION,
  PARTITION_LABELS_VALUE,
  PIE_VIS_EXPRESSION_NAME,
  PARTITION_VIS_RENDERER_NAME,
} from '../constants';
import { strings } from './i18n';

export const pieVisFunction = (): PieVisExpressionFunctionDefinition => ({
  name: PIE_VIS_EXPRESSION_NAME,
  type: 'render',
  inputTypes: ['datatable'],
  help: strings.getPieVisFunctionName(),
  args: {
    metric: {
      types: ['vis_dimension'],
      help: strings.getMetricArgHelp(),
      required: true,
    },
    buckets: {
      types: ['vis_dimension'],
      help: strings.getBucketsArgHelp(),
      multi: true,
    },
    splitColumn: {
      types: ['vis_dimension'],
      help: strings.getSplitColumnArgHelp(),
      multi: true,
    },
    splitRow: {
      types: ['vis_dimension'],
      help: strings.getSplitRowArgHelp(),
      multi: true,
    },
    addTooltip: {
      types: ['boolean'],
      help: strings.getAddTooltipArgHelp(),
      default: true,
    },
    addLegend: {
      types: ['boolean'],
      help: strings.getAddLegendArgHelp(),
    },
    legendPosition: {
      types: ['string'],
      help: strings.getLegendPositionArgHelp(),
    },
    nestedLegend: {
      types: ['boolean'],
      help: strings.getNestedLegendArgHelp(),
      default: false,
    },
    truncateLegend: {
      types: ['boolean'],
      help: strings.getTruncateLegendArgHelp(),
      default: true,
    },
    maxLegendLines: {
      types: ['number'],
      help: strings.getMaxLegendLinesArgHelp(),
    },
    distinctColors: {
      types: ['boolean'],
      help: strings.getDistinctColorsArgHelp(),
      default: false,
    },
    isDonut: {
      types: ['boolean'],
      help: strings.getIsDonutArgHelp(),
      default: false,
    },
    emptySizeRatio: {
      types: ['number'],
      help: strings.getEmptySizeRatioArgHelp(),
      default: EmptySizeRatios.SMALL,
    },
    palette: {
      types: ['palette', 'system_palette'],
      help: strings.getPaletteArgHelp(),
      default: '{palette}',
    },
    labels: {
      types: [PARTITION_LABELS_VALUE],
      help: strings.getLabelsArgHelp(),
      default: `{${PARTITION_LABELS_FUNCTION}}`,
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
          i18n.translate('expressionPartitionVis.pieVis.function.dimension.metric', {
            defaultMessage: 'Slice size',
          }),
        ],
        [
          args.buckets,
          i18n.translate('expressionPartitionVis.pieVis.function.dimension.buckets', {
            defaultMessage: 'Slice',
          }),
        ],
        [
          args.splitColumn,
          i18n.translate('expressionPartitionVis.pieVis.function.dimension.splitcolumn', {
            defaultMessage: 'Column split',
          }),
        ],
        [
          args.splitRow,
          i18n.translate('expressionPartitionVis.pieVis.function.dimension.splitrow', {
            defaultMessage: 'Row split',
          }),
        ],
      ]);
      handlers.inspectorAdapters.tables.logDatatable('default', logTable);
    }

    return {
      type: 'render',
      as: PARTITION_VIS_RENDERER_NAME,
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
