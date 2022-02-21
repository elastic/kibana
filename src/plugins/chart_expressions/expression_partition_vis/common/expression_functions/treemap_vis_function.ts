/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LegendDisplay, PartitionVisParams } from '../types/expression_renderers';
import { prepareLogTable } from '../../../../visualizations/common/utils';
import { ChartTypes, TreemapVisExpressionFunctionDefinition } from '../types';
import {
  PARTITION_LABELS_FUNCTION,
  PARTITION_LABELS_VALUE,
  PARTITION_VIS_RENDERER_NAME,
  TREEMAP_VIS_EXPRESSION_NAME,
} from '../constants';
import { errors, strings } from './i18n';

export const treemapVisFunction = (): TreemapVisExpressionFunctionDefinition => ({
  name: TREEMAP_VIS_EXPRESSION_NAME,
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
    ariaLabel: {
      types: ['string'],
      help: strings.getAriaLabelHelp(),
      required: false,
    },
  },
  fn(context, args, handlers) {
    const maxSupportedBuckets = 2;
    if ((args.buckets ?? []).length > maxSupportedBuckets) {
      throw new Error(errors.moreThanNBucketsAreNotSupportedError(maxSupportedBuckets));
    }

    if (args.splitColumn && args.splitRow) {
      throw new Error(errors.splitRowAndSplitColumnAreSpecifiedError());
    }

    const visConfig: PartitionVisParams = {
      ...args,
      ariaLabel:
        args.ariaLabel ??
        (handlers.variables?.embeddableTitle as string) ??
        handlers.getExecutionContext?.()?.description,
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
        [[args.metric], strings.getSliceSizeHelp()],
        [args.buckets, strings.getSliceHelp()],
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
        visType: ChartTypes.TREEMAP,
        params: {
          listenOnChange: true,
        },
      },
    };
  },
});
