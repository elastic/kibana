/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import {
  ExpressionFunctionDefinition,
  Datatable,
  Range,
  Render,
  Style,
} from '../../expressions/public';
import { visType, DimensionsVisParam, VisParams } from './types';
import { ColorSchemas, vislibColorMaps, ColorMode } from '../../charts/public';

export type Input = Datatable;

interface Arguments {
  percentageMode: boolean;
  colorSchema: ColorSchemas;
  colorMode: ColorMode;
  useRanges: boolean;
  invertColors: boolean;
  showLabels: boolean;
  bgFill: string;
  subText: string;
  colorRange: Range[];
  font: Style;
  metric: any[]; // these aren't typed yet
  bucket: any; // these aren't typed yet
}

export interface MetricVisRenderValue {
  visType: typeof visType;
  visData: Input;
  visConfig: Pick<VisParams, 'metric' | 'dimensions'>;
}

export type MetricVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'metricVis',
  Input,
  Arguments,
  Render<MetricVisRenderValue>
>;

export const createMetricVisFn = (): MetricVisExpressionFunctionDefinition => ({
  name: 'metricVis',
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('visTypeMetric.function.help', {
    defaultMessage: 'Metric visualization',
  }),
  args: {
    percentageMode: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('visTypeMetric.function.percentageMode.help', {
        defaultMessage: 'Shows metric in percentage mode. Requires colorRange to be set.',
      }),
    },
    colorSchema: {
      types: ['string'],
      default: '"Green to Red"',
      options: Object.values(vislibColorMaps).map((value: any) => value.id),
      help: i18n.translate('visTypeMetric.function.colorSchema.help', {
        defaultMessage: 'Color schema to use',
      }),
    },
    colorMode: {
      types: ['string'],
      default: '"None"',
      options: [ColorMode.None, ColorMode.Labels, ColorMode.Background],
      help: i18n.translate('visTypeMetric.function.colorMode.help', {
        defaultMessage: 'Which part of metric to color',
      }),
    },
    colorRange: {
      types: ['range'],
      multi: true,
      default: '{range from=0 to=10000}',
      help: i18n.translate('visTypeMetric.function.colorRange.help', {
        defaultMessage:
          'A range object specifying groups of values to which different colors should be applied.',
      }),
    },
    useRanges: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('visTypeMetric.function.useRanges.help', {
        defaultMessage: 'Enabled color ranges.',
      }),
    },
    invertColors: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('visTypeMetric.function.invertColors.help', {
        defaultMessage: 'Inverts the color ranges',
      }),
    },
    showLabels: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('visTypeMetric.function.showLabels.help', {
        defaultMessage: 'Shows labels under the metric values.',
      }),
    },
    bgFill: {
      types: ['string'],
      default: '"#000"',
      aliases: ['backgroundFill', 'bgColor', 'backgroundColor'],
      help: i18n.translate('visTypeMetric.function.bgFill.help', {
        defaultMessage:
          'Color as html hex code (#123456), html color (red, blue) or rgba value (rgba(255,255,255,1)).',
      }),
    },
    font: {
      types: ['style'],
      help: i18n.translate('visTypeMetric.function.font.help', {
        defaultMessage: 'Font settings.',
      }),
      default: '{font size=60}',
    },
    subText: {
      types: ['string'],
      aliases: ['label', 'text', 'description'],
      default: '""',
      help: i18n.translate('visTypeMetric.function.subText.help', {
        defaultMessage: 'Custom text to show under the metric',
      }),
    },
    metric: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeMetric.function.metric.help', {
        defaultMessage: 'metric dimension configuration',
      }),
      required: true,
      multi: true,
    },
    bucket: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeMetric.function.bucket.help', {
        defaultMessage: 'bucket dimension configuration',
      }),
    },
  },
  fn(input, args, handlers) {
    const dimensions: DimensionsVisParam = {
      metrics: args.metric,
    };

    if (args.bucket) {
      dimensions.bucket = args.bucket;
    }

    if (args.percentageMode && (!args.colorRange || args.colorRange.length === 0)) {
      throw new Error('colorRange must be provided when using percentageMode');
    }

    const fontSize = Number.parseInt(args.font.spec.fontSize || '', 10);

    if (handlers?.inspectorAdapters?.tables) {
      handlers.inspectorAdapters.tables.logDatatable('default', input);
    }
    return {
      type: 'render',
      as: 'metric_vis',
      value: {
        visData: input,
        visType,
        visConfig: {
          metric: {
            percentageMode: args.percentageMode,
            useRanges: args.useRanges,
            colorSchema: args.colorSchema,
            metricColorMode: args.colorMode,
            colorsRange: args.colorRange,
            labels: {
              show: args.showLabels,
            },
            invertColors: args.invertColors,
            style: {
              bgFill: args.bgFill,
              bgColor: args.colorMode === ColorMode.Background,
              labelColor: args.colorMode === ColorMode.Labels,
              subText: args.subText,
              fontSize,
            },
          },
          dimensions,
        },
      },
    };
  },
});
