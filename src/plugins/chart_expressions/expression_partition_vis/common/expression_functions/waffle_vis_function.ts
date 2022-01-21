/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LegendDisplay, PartitionVisParams } from '../types/expression_renderers';
import { prepareLogTable } from '../../../../visualizations/common/prepare_log_table';
import { ChartTypes, WaffleVisExpressionFunctionDefinition } from '../types';
import {
  PARTITION_LABELS_FUNCTION,
  PARTITION_LABELS_VALUE,
  PARTITION_VIS_RENDERER_NAME,
  WAFFLE_VIS_EXPRESSION_NAME,
} from '../constants';
import { strings } from './i18n';

export const waffleVisFunction = (): WaffleVisExpressionFunctionDefinition => ({
  name: WAFFLE_VIS_EXPRESSION_NAME,
  type: 'render',
  inputTypes: ['datatable'],
  help: strings.getPieVisFunctionName(),
  args: {
    metric: {
      types: ['vis_dimension'],
      help: strings.getMetricArgHelp(),
      required: true,
    },
    bucket: {
      types: ['vis_dimension'],
      help: strings.getBucketArgHelp(),
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
    legendDisplay: {
      types: ['string'],
      help: strings.getLegendDisplayArgHelp(),
      options: [LegendDisplay.SHOW, LegendDisplay.HIDE, LegendDisplay.DEFAULT],
      default: LegendDisplay.HIDE,
    },
    legendPosition: {
      types: ['string'],
      help: strings.getLegendPositionArgHelp(),
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
    showValuesInLegend: {
      types: ['boolean'],
      help: strings.getShowValuesInLegendArgHelp(),
      default: false,
    },
  },
  fn(context, args, handlers) {
    const buckets = args.bucket ? [args.bucket] : [];
    const visConfig: PartitionVisParams = {
      ...args,
      palette: args.palette,
      dimensions: {
        metric: args.metric,
        buckets,
        splitColumn: args.splitColumn,
        splitRow: args.splitRow,
      },
    };

    if (handlers?.inspectorAdapters?.tables) {
      const logTable = prepareLogTable(context, [
        [[args.metric], strings.getSliceSizeHelp()],
        [buckets, strings.getSliceHelp()],
        [args.splitColumn, strings.getColumnSplitHelp()],
        [args.splitRow, strings.getRowSplitHelp()],
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
        visType: ChartTypes.WAFFLE,
        params: {
          listenOnChange: true,
        },
      },
    };
  },
});
