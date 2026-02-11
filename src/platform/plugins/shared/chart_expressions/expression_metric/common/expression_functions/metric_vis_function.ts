/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import type { Dimension } from '@kbn/visualizations-common';
import { validateAccessor } from '@kbn/chart-expressions-common';
import { prepareLogTable } from '@kbn/visualizations-common';
import { LayoutDirection } from '@elastic/charts';
import type { MetricVisRenderConfig } from '../types';
import { visType } from '../types';
import type { MetricVisExpressionFunctionDefinition } from '../types';
import { EXPRESSION_METRIC_NAME, EXPRESSION_METRIC_TRENDLINE_NAME } from '../constants';

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
        defaultMessage: 'The Primary Metric.',
      }),
      required: true,
    },
    secondaryMetric: {
      types: ['vis_dimension', 'string'],
      help: i18n.translate('expressionMetricVis.function.secondaryMetric.help', {
        defaultMessage: 'The Secondary Metric.',
      }),
    },
    max: {
      types: ['vis_dimension', 'string'],
      help: i18n.translate('expressionMetricVis.function.max.help.', {
        defaultMessage: 'The dimension containing the maximum value.',
      }),
    },
    breakdownBy: {
      types: ['vis_dimension', 'string'],
      help: i18n.translate('expressionMetricVis.function.breakdownBy.help', {
        defaultMessage: 'The dimension containing the labels for sub-categories.',
      }),
    },
    trendline: {
      types: [EXPRESSION_METRIC_TRENDLINE_NAME],
      help: i18n.translate('expressionMetricVis.function.trendline.help', {
        defaultMessage: 'An optional trendline configuration',
      }),
    },
    subtitle: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.subtitle.help', {
        defaultMessage: 'The subtitle for a single metric. Overridden if breakdownBy is supplied.',
      }),
    },
    secondaryLabel: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.secondaryLabel.help', {
        defaultMessage: 'Optional text displayed next to the Secondary Metric.',
      }),
    },
    progressDirection: {
      types: ['string'],
      options: [LayoutDirection.Vertical, LayoutDirection.Horizontal],
      help: i18n.translate('expressionMetricVis.function.progressDirection.help', {
        defaultMessage:
          'The direction the progress bar should grow. Must be provided to render a progress bar.',
      }),
    },
    titlesTextAlign: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.titlesTextAlign.help', {
        defaultMessage: 'The alignment of the Title and Subtitle.',
      }),
    },
    primaryAlign: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.primaryAlign.help', {
        defaultMessage: 'The alignment of the Primary Metric.',
      }),
    },
    secondaryAlign: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.secondaryAlign.help', {
        defaultMessage: 'The alignment of the Secondary Metric.',
      }),
    },
    iconAlign: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.iconAlign.help', {
        defaultMessage: 'The alignment of icon.',
      }),
    },
    valueFontSize: {
      types: ['string', 'number'],
      help: i18n.translate('expressionMetricVis.function.valueFontSize.help', {
        defaultMessage: 'The value font size.',
      }),
    },
    primaryPosition: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.primaryPosition.help', {
        defaultMessage: 'The postion of the Primary Metric (top or bottom).',
      }),
    },
    titleWeight: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.titleWeight.help', {
        defaultMessage: 'The title weight.',
      }),
    },
    color: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.color.help', {
        defaultMessage: 'Provides a static visualization color. Overridden by palette.',
      }),
    },
    icon: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.icon.help', {
        defaultMessage: 'Provides a static visualization icon.',
      }),
    },
    palette: {
      types: ['palette'],
      help: i18n.translate('expressionMetricVis.function.palette.help', {
        defaultMessage: 'Provides colors for the values, based on the bounds.',
      }),
    },
    maxCols: {
      types: ['number'],
      help: i18n.translate('expressionMetricVis.function.numCols.help', {
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
    inspectorTableId: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.inspectorTableId.help', {
        defaultMessage: 'An ID for the inspector table',
      }),
      multi: false,
      default: 'default',
    },
    secondaryColor: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.secondaryColor.help', {
        defaultMessage: 'A static color to use for the Secondary Metric',
      }),
      required: false,
    },
    secondaryTrendVisuals: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.secondaryTrend.visuals.help', {
        defaultMessage: 'Specifies the mode for the Secondary Metric trend value',
      }),
      required: false,
    },
    secondaryTrendBaseline: {
      types: ['string', 'number'],
      help: i18n.translate('expressionMetricVis.function.secondaryTrend.baseline.help', {
        defaultMessage: 'Specifies the baseline used for the Secondary Metric trend',
      }),
      required: false,
    },
    secondaryTrendPalette: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.secondaryTrend.palette.help', {
        defaultMessage: 'Specifies the palette used for the Secondary Metric trend',
      }),
      multi: true,
      required: false,
    },
    secondaryLabelPosition: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.secondaryLabelPosition.help', {
        defaultMessage: 'Specifies the position of the Secondary Metric label',
      }),
      required: false,
    },
    applyColorTo: {
      types: ['string'],
      help: i18n.translate('expressionMetricVis.function.applyColorTo.help', {
        defaultMessage:
          'Determines whether the metric color is applied to the background area or to the value',
      }),
      required: false,
    },
  },
  fn(input, args, handlers) {
    validateAccessor(args.metric, input.columns);
    validateAccessor(args.secondaryMetric, input.columns);
    validateAccessor(args.max, input.columns);
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

      if (args.max) {
        argsTable.push([
          [args.max],
          i18n.translate('expressionMetricVis.function.dimension.maximum', {
            defaultMessage: 'Maximum',
          }),
        ]);
      }

      const logTable = prepareLogTable(input, argsTable, true);
      handlers.inspectorAdapters.tables.logDatatable(args.inspectorTableId, logTable);

      if (args.trendline?.inspectorTable && args.trendline.inspectorTableId) {
        handlers.inspectorAdapters.tables.logDatatable(
          args.trendline?.inspectorTableId,
          args.trendline?.inspectorTable
        );
      }
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
            secondaryLabel: args.secondaryLabel,
            color: args.color,
            icon: args.icon,
            palette: args.palette,
            progressDirection: args.progressDirection,
            titlesTextAlign: args.titlesTextAlign,
            primaryAlign: args.primaryAlign,
            secondaryAlign: args.secondaryAlign,
            iconAlign: args.iconAlign,
            valueFontSize: args.valueFontSize,
            primaryPosition: args.primaryPosition,
            titleWeight: args.titleWeight,
            maxCols: args.maxCols,
            minTiles: args.minTiles,
            trends: args.trendline?.trends,
            secondaryColor: args.secondaryColor,
            secondaryTrend: {
              visuals: args.secondaryTrendVisuals,
              baseline: args.secondaryTrendBaseline,
              palette: args.secondaryTrendPalette,
            },
            secondaryLabelPosition: args.secondaryLabelPosition,
            applyColorTo: args.applyColorTo,
          },
          dimensions: {
            metric: args.metric,
            secondaryMetric: args.secondaryMetric,
            max: args.max,
            breakdownBy: args.breakdownBy,
          },
        },
        overrides: handlers.variables?.overrides as MetricVisRenderConfig['overrides'],
      },
    };
  },
});
