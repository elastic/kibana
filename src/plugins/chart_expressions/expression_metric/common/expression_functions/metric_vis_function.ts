/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { visType } from '../types';
import {
  prepareLogTable,
  Dimension,
  validateAccessor,
} from '../../../../visualizations/common/utils';
import { ColorMode } from '../../../../charts/common';
import { MetricVisExpressionFunctionDefinition } from '../types';
import { EXPRESSION_METRIC_NAME, LabelPosition } from '../constants';

const errors = {
  severalMetricsAndColorFullBackgroundSpecifiedError: () =>
    i18n.translate(
      'expressionMetricVis.function.errors.severalMetricsAndColorFullBackgroundSpecified',
      {
        defaultMessage:
          'Full background coloring cannot be applied to a visualization with multiple metrics.',
      }
    ),
  splitByBucketAndColorFullBackgroundSpecifiedError: () =>
    i18n.translate(
      'expressionMetricVis.function.errors.splitByBucketAndColorFullBackgroundSpecified',
      {
        defaultMessage:
          'Full background coloring cannot be applied to visualizations that have a bucket specified.',
      }
    ),
};

export const metricVisFunction = (): MetricVisExpressionFunctionDefinition => ({
  name: EXPRESSION_METRIC_NAME,
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('expressionMetricVis.function.help', {
    defaultMessage: 'Metric visualization',
  }),
  args: {
    percentageMode: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('expressionMetricVis.function.percentageMode.help', {
        defaultMessage: 'Shows metric in percentage mode. Requires colorRange to be set.',
      }),
    },
    colorMode: {
      types: ['string'],
      default: `"${ColorMode.None}"`,
      options: [ColorMode.None, ColorMode.Labels, ColorMode.Background],
      help: i18n.translate('expressionMetricVis.function.colorMode.help', {
        defaultMessage: 'Which part of metric to color',
      }),
      strict: true,
    },
    colorFullBackground: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('expressionMetricVis.function.colorFullBackground.help', {
        defaultMessage: 'Applies the selected background color to the full visualization container',
      }),
    },
    palette: {
      types: ['palette'],
      help: i18n.translate('expressionMetricVis.function.palette.help', {
        defaultMessage: 'Provides colors for the values, based on the bounds.',
      }),
    },
    showLabels: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('expressionMetricVis.function.showLabels.help', {
        defaultMessage: 'Shows labels under the metric values.',
      }),
    },
    font: {
      types: ['style'],
      help: i18n.translate('expressionMetricVis.function.font.help', {
        defaultMessage: 'Font settings.',
      }),
      default: `{font size=60 align="center"}`,
    },
    labelFont: {
      types: ['style'],
      help: i18n.translate('expressionMetricVis.function.labelFont.help', {
        defaultMessage: 'Label font settings.',
      }),
      default: `{font size=24 align="center"}`,
    },
    labelPosition: {
      types: ['string'],
      options: [LabelPosition.BOTTOM, LabelPosition.TOP],
      help: i18n.translate('expressionMetricVis.function.labelPosition.help', {
        defaultMessage: 'Label position',
      }),
      default: LabelPosition.BOTTOM,
      strict: true,
    },
    metric: {
      types: ['string', 'vis_dimension'],
      help: i18n.translate('expressionMetricVis.function.metric.help', {
        defaultMessage: 'metric dimension configuration',
      }),
      required: true,
      multi: true,
    },
    bucket: {
      types: ['string', 'vis_dimension'],
      help: i18n.translate('expressionMetricVis.function.bucket.help', {
        defaultMessage: 'bucket dimension configuration',
      }),
    },
    autoScale: {
      types: ['boolean'],
      help: i18n.translate('expressionMetricVis.function.autoScale.help', {
        defaultMessage: 'Enable auto scale',
      }),
      required: false,
    },
  },
  fn(input, args, handlers) {
    if (args.percentageMode && !args.palette?.params) {
      throw new Error('Palette must be provided when using percentageMode');
    }

    // currently we can allow colorize full container only for one metric
    if (args.colorFullBackground) {
      if (args.bucket) {
        throw new Error(errors.splitByBucketAndColorFullBackgroundSpecifiedError());
      }

      if (args.metric.length > 1 || input.rows.length > 1) {
        throw new Error(errors.severalMetricsAndColorFullBackgroundSpecifiedError());
      }
    }

    args.metric.forEach((metric) => validateAccessor(metric, input.columns));
    validateAccessor(args.bucket, input.columns);

    if (handlers?.inspectorAdapters?.tables) {
      const argsTable: Dimension[] = [
        [
          args.metric,
          i18n.translate('expressionMetricVis.function.dimension.metric', {
            defaultMessage: 'Metric',
          }),
        ],
      ];
      if (args.bucket) {
        argsTable.push([
          [args.bucket],
          i18n.translate('expressionMetricVis.function.dimension.splitGroup', {
            defaultMessage: 'Split group',
          }),
        ]);
      }
      const logTable = prepareLogTable(input, argsTable);
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
            percentageMode: args.percentageMode,
            metricColorMode: args.colorMode,
            labels: {
              show: args.showLabels,
              position: args.labelPosition,
              style: {
                ...args.labelFont,
              },
            },
            colorFullBackground: args.colorFullBackground,
            style: {
              bgColor: args.colorMode === ColorMode.Background,
              labelColor: args.colorMode === ColorMode.Labels,
              ...args.font,
            },
            autoScale: args.autoScale,
          },
          dimensions: {
            metrics: args.metric,
            ...(args.bucket ? { bucket: args.bucket } : {}),
          },
        },
      },
    };
  },
});
