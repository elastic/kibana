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
  help: i18n.translate('expressionNewMetricVis.function.help', {
    defaultMessage: 'Metric visualization',
  }),
  args: {
    metric: {
      types: ['vis_dimension', 'string'],
      help: i18n.translate('expressionNewMetricVis.function.metric.help', {
        defaultMessage: 'The primary metric.',
      }),
    },
    secondaryMetric: {
      types: ['vis_dimension', 'string'],
      help: i18n.translate('expressionNewMetricVis.function.secondaryMetric.help', {
        defaultMessage: 'The secondary metric (shown above the primary).',
      }),
    },
    breakdownBy: {
      types: ['vis_dimension', 'string'],
      help: i18n.translate('expressionNewMetricVis.function.breakdownBy.help', {
        defaultMessage: 'The dimension containing the labels for sub-categories.',
      }),
    },
    subtitle: {
      types: ['string'],
      help: i18n.translate('expressionNewMetricVis.function.subtitle.help', {
        defaultMessage: 'The subtitle for a single metric. Overridden if breakdownBy is supplied.',
      }),
    },
    extraText: {
      types: ['string'],
      help: i18n.translate('expressionNewMetricVis.function.extra.help', {
        defaultMessage: 'Text to be shown above metric value. Overridden by secondaryMetric.',
      }),
    },
    progressMin: {
      types: ['number'],
      default: 0,
      help: i18n.translate('expressionNewMetricVis.function.progressMin.help', {
        defaultMessage: 'The number at which the progress bar should be empty.',
      }),
    },
    progressMax: {
      types: ['number'],
      // TODO: revisit default
      help: i18n.translate('expressionNewMetricVis.function.progressMax.help.', {
        defaultMessage: 'The number at which the progress bar should be full.',
      }),
    },
    progressDirection: {
      types: ['string'],
      options: [LayoutDirection.Vertical, LayoutDirection.Horizontal],
      default: LayoutDirection.Vertical,
      help: i18n.translate('expressionNewMetricVis.function.progressDirection.help', {
        defaultMessage: 'The direction the progress bar should grow.',
      }),
      strict: true,
    },
    palette: {
      types: ['palette'],
      help: i18n.translate('expressionNewMetricVis.function.palette.help', {
        defaultMessage: 'Provides colors for the values, based on the bounds.',
      }),
    },
    maxCols: {
      types: ['number'],
      help: i18n.translate('expressionNewMetricVis.function.numCols.help', {
        defaultMessage: 'Specifies the max number of columns in the metric grid.',
      }),
      default: 5,
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
          i18n.translate('expressionNewMetricVis.function.dimension.metric', {
            defaultMessage: 'Metric',
          }),
        ],
      ];
      if (args.breakdownBy) {
        argsTable.push([
          [args.breakdownBy],
          i18n.translate('expressionNewMetricVis.function.dimension.splitGroup', {
            defaultMessage: 'Split group',
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
            progressMin: args.progressMin,
            progressMax: args.progressMax,
            progressDirection: args.progressDirection,
            maxCols: args.maxCols,
          },
          dimensions: {
            metric: args.metric,
            secondaryMetric: args.secondaryMetric,
            breakdownBy: args.breakdownBy,
          },
        },
      },
    };
  },
});
