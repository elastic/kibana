/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import {
  prepareLogTable,
  Dimension,
  validateAccessor,
} from '@kbn/visualizations-plugin/common/utils';
import { LayoutDirection } from '@elastic/charts';
import { visType } from '../types';
import { MetricVisExpressionFunctionDefinition } from '../types';
import { EXPRESSION_METRIC_NAME } from '../constants';

export const metricVisFunction = (): MetricVisExpressionFunctionDefinition => ({
  name: EXPRESSION_METRIC_NAME,
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('expressionMetricVis.function.help', {
    defaultMessage: 'Metric visualization',
  }),
  args: {
    metric: {
      types: ['vis_dimension', 'string'],
      help: i18n.translate('expressionMetricVis.function.metric.help', {
        defaultMessage: 'The primary metric.',
      }),
    },
    secondaryMetric: {
      types: ['vis_dimension', 'string'],
      help: i18n.translate('expressionMetricVis.function.secondaryMetric.help', {
        defaultMessage: 'The secondary metric (shown above the primary).',
      }),
    },
    breakdownBy: {
      types: ['vis_dimension', 'string'],
      help: i18n.translate('expressionMetricVis.function.breakdownBy.help', {
        defaultMessage: 'The dimension containing the labels for sub-categories.',
      }),
    },
    subtitle: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.subtitle.help', {
        defaultMessage: 'The subtitle for a single metric. Overridden if breakdownBy is supplied.',
      }),
    },
    extraText: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.extra.help', {
        defaultMessage: 'Text to be shown above metric value. Overridden by secondaryMetric.',
      }),
    },
    progressMax: {
      types: ['vis_dimension', 'string'],
      help: i18n.translate('expressionMetricVis.function.progressMax.help.', {
        defaultMessage: 'The dimension containing the maximum value.',
      }),
    },
    progressDirection: {
      types: ['string'],
      options: [LayoutDirection.Vertical, LayoutDirection.Horizontal],
      default: LayoutDirection.Vertical,
      help: i18n.translate('expressionMetricVis.function.progressDirection.help', {
        defaultMessage: 'The direction the progress bar should grow.',
      }),
      strict: true,
    },
    palette: {
      types: ['palette'],
      help: i18n.translate('expressionMetricVis.function.palette.help', {
        defaultMessage: 'Provides colors for the values, based on the bounds.',
      }),
    },
    maxCols: {
      types: ['number'],
      help: i18n.translate('expressionMetricVis.function.maxCols.help', {
        defaultMessage: 'Specifies the max number of columns in the metric grid.',
      }),
      default: 5,
    },
    minTiles: {
      types: ['number'],
      help: i18n.translate('expressionMetricVis.function.minTiles.help', {
        defaultMessage:
          'Specifies the minimum number of tiles in the metric grid regardless of the input data.',
      }),
    },
  },
  fn(input, args, handlers) {
    validateAccessor(args.metric, input.columns);
    validateAccessor(args.secondaryMetric, input.columns);
    validateAccessor(args.breakdownBy, input.columns);

    if (handlers?.inspectorAdapters?.tables) {
      handlers.inspectorAdapters.tables.reset();
      handlers.inspectorAdapters.tables.allowCsvExport = true;

      const argsTable: Dimension[] = [
        [
          [args.metric],
          i18n.translate('expressionMetricVis.function.dimension.metric', {
            defaultMessage: 'Metric',
          }),
        ],
      ];

      if (args.secondaryMetric) {
        argsTable.push([
          [args.secondaryMetric],
          i18n.translate('expressionMetricVis.function.dimension.secondaryMetric', {
            defaultMessage: 'Secondary Metric',
          }),
        ]);
      }

      if (args.breakdownBy) {
        argsTable.push([
          [args.breakdownBy],
          i18n.translate('expressionMetricVis.function.dimension.splitGroup', {
            defaultMessage: 'Split group',
          }),
        ]);
      }

      if (args.progressMax) {
        argsTable.push([
          [args.progressMax],
          i18n.translate('expressionMetricVis.function.dimension.maximum', {
            defaultMessage: 'Maximum',
          }),
        ]);
      }

      const logTable = prepareLogTable(input, argsTable, true);
      handlers.inspectorAdapters.tables.logDatatable('default', logTable);
    }

    return {
      type: 'render',
      as: EXPRESSION_METRIC_NAME,
      value: {
        visData: input,
        visType,
        visConfig: {
          metric: {
            subtitle: args.subtitle,
            extraText: args.extraText,
            palette: args.palette?.params,
            progressDirection: args.progressDirection,
            maxCols: args.maxCols,
            minTiles: args.minTiles,
          },
          dimensions: {
            metric: args.metric,
            secondaryMetric: args.secondaryMetric,
            breakdownBy: args.breakdownBy,
            progressMax: args.progressMax,
          },
        },
      },
    };
  },
});
