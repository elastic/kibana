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
      types: ['vis_dimension'],
      help: i18n.translate('expressionNewMetricVis.function.metric.help', {
        defaultMessage: 'The primary metric.',
      }),
    },
    secondaryMetric: {
      types: ['vis_dimension'],
      help: i18n.translate('expressionNewMetricVis.function.secondaryMetric.help', {
        defaultMessage: 'The secondary metric (shown above the primary).',
      }),
    },
    breakdownBy: {
      types: ['vis_dimension'],
      help: i18n.translate('expressionNewMetricVis.function.breakdownBy.help', {
        defaultMessage: 'The dimension containing the labels for sub-categories.',
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
      default: 0,
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
    numTiles: {
      types: ['number'],
      help: i18n.translate('expressionNewMetricVis.function.numTiles.help', {
        defaultMessage: 'Constrains the total number of tiles to a fixed number.',
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
            palette: args.palette?.params,
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
