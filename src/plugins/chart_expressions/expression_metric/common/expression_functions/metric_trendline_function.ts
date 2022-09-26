/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import {
  validateAccessor,
  getColumnByAccessor,
  prepareLogTable,
  Dimension,
} from '@kbn/visualizations-plugin/common/utils';
import { DatatableRow } from '@kbn/expressions-plugin/common';
import { MetricWTrend } from '@elastic/charts';
import type { TrendlineExpressionFunctionDefinition } from '../types';
import { EXPRESSION_METRIC_TRENDLINE_NAME } from '../constants';

export const metricTrendlineFunction = (): TrendlineExpressionFunctionDefinition => ({
  name: EXPRESSION_METRIC_TRENDLINE_NAME,
  inputTypes: ['datatable'],
  type: EXPRESSION_METRIC_TRENDLINE_NAME,
  help: i18n.translate('expressionMetricTrendline.function.help', {
    defaultMessage: 'Metric visualization',
  }),
  args: {
    metric: {
      types: ['vis_dimension', 'string'],
      help: i18n.translate('expressionMetricTrendline.function.metric.help', {
        defaultMessage: 'The primary metric.',
      }),
      required: true,
    },
    timeField: {
      types: ['vis_dimension', 'string'],
      help: i18n.translate('expressionMetricTrendline.function.metric.help', {
        defaultMessage: 'The time field for the trend line',
      }),
      required: true,
    },
    breakdownBy: {
      types: ['vis_dimension', 'string'],
      help: i18n.translate('expressionMetricTrendline.function.breakdownBy.help', {
        defaultMessage: 'The dimension containing the labels for sub-categories.',
      }),
    },
    table: {
      types: ['datatable'],
      help: i18n.translate('expressionMetricTrendline.function.table.help', {
        defaultMessage: 'A data table',
      }),
      multi: false,
    },
    inspectorTableId: {
      types: ['string'],
      help: i18n.translate('expressionMetricTrendline.function.inspectorTableId.help', {
        defaultMessage: 'An ID for the inspector table',
      }),
      multi: false,
      default: 'trendline',
    },
  },
  fn(input, args, handlers) {
    const table = args.table;
    validateAccessor(args.metric, table.columns);
    validateAccessor(args.timeField, table.columns);
    validateAccessor(args.breakdownBy, table.columns);

    const argsTable: Dimension[] = [
      [
        [args.metric],
        i18n.translate('expressionMetricVis.function.dimension.metric', {
          defaultMessage: 'Metric',
        }),
      ],
      [
        [args.timeField],
        i18n.translate('expressionMetricVis.function.dimension.timeField', {
          defaultMessage: 'Time field',
        }),
      ],
    ];

    if (args.breakdownBy) {
      argsTable.push([
        [args.breakdownBy],
        i18n.translate('expressionMetricVis.function.dimension.splitGroup', {
          defaultMessage: 'Split group',
        }),
      ]);
    }

    const inspectorTable = prepareLogTable(table, argsTable, true);

    const metricColId = getColumnByAccessor(args.metric, table.columns)?.id;
    const timeColId = getColumnByAccessor(args.timeField, table.columns)?.id;

    if (!metricColId || !timeColId) {
      throw new Error("Metric trendline - couldn't find metric or time column!");
    }

    const trends: Record<string, MetricWTrend['trend']> = {};

    if (!args.breakdownBy) {
      trends.default = table.rows.map((row) => ({
        x: row[timeColId],
        y: row[metricColId],
      })); // TODO is the table ordered correctly?
    } else {
      const breakdownByColId = getColumnByAccessor(args.breakdownBy, table.columns)?.id;

      if (!breakdownByColId) {
        throw new Error("Metric trendline - couldn't find breakdown column!");
      }

      const rowsByBreakdown: Record<string, DatatableRow[]> = {};
      table.rows.forEach((row) => {
        const breakdownTerm = row[breakdownByColId];
        if (!(breakdownTerm in rowsByBreakdown)) {
          rowsByBreakdown[breakdownTerm] = [];
        }
        rowsByBreakdown[breakdownTerm].push(row);
      });

      for (const breakdownTerm in rowsByBreakdown) {
        if (!rowsByBreakdown.hasOwnProperty(breakdownTerm)) continue;
        trends[breakdownTerm] = rowsByBreakdown[breakdownTerm].map((row) => ({
          x: row[timeColId],
          y: row[metricColId],
        }));
      }
    }

    return {
      type: EXPRESSION_METRIC_TRENDLINE_NAME,
      trends,
      inspectorTable,
      inspectorTableId: args.inspectorTableId,
    };
  },
});
