/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type {
  ExpressionFunctionDefinition,
  Datatable,
  ExpressionValueBoxed,
} from '@kbn/expressions-plugin/public';
import type { SeriesParam } from '../types';

export interface Arguments extends Omit<SeriesParam, 'data'> {
  label: string;
  id: string;
}

export type ExpressionValueSeriesParam = ExpressionValueBoxed<
  'series_param',
  {
    data: { label: string; id: string };
    drawLinesBetweenPoints?: boolean;
    interpolate?: SeriesParam['interpolate'];
    lineWidth?: number;
    mode: SeriesParam['mode'];
    show: boolean;
    showCircles: boolean;
    circlesRadius: number;
    seriesParamType: SeriesParam['type'];
    valueAxis: string;
  }
>;

export const seriesParam = (): ExpressionFunctionDefinition<
  'seriesparam',
  Datatable,
  Arguments,
  ExpressionValueSeriesParam
> => ({
  name: 'seriesparam',
  help: i18n.translate('visTypeXy.function.seriesparam.help', {
    defaultMessage: 'Generates series param object',
  }),
  type: 'series_param',
  inputTypes: ['datatable'],
  args: {
    label: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.seriesParam.label.help', {
        defaultMessage: 'Name of series param',
      }),
      required: true,
    },
    id: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.seriesParam.id.help', {
        defaultMessage: 'Id of series param',
      }),
      required: true,
    },
    drawLinesBetweenPoints: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.seriesParam.drawLinesBetweenPoints.help', {
        defaultMessage: 'Draw lines between points',
      }),
    },
    interpolate: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.seriesParam.interpolate.help', {
        defaultMessage: 'Interpolate mode. Can be linear, cardinal or step-after',
      }),
    },
    show: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.seriesParam.show.help', {
        defaultMessage: 'Show param',
      }),
      required: true,
    },
    lineWidth: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.seriesParam.lineWidth.help', {
        defaultMessage: 'Width of line',
      }),
    },
    mode: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.seriesParam.mode.help', {
        defaultMessage: 'Chart mode. Can be stacked or percentage',
      }),
    },
    showCircles: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.seriesParam.showCircles.help', {
        defaultMessage: 'Show circles',
      }),
    },
    circlesRadius: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.seriesParam.circlesRadius.help', {
        defaultMessage: 'Defines the circles size (radius)',
      }),
    },
    type: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.seriesParam.type.help', {
        defaultMessage: 'Chart type. Can be line, area or histogram',
      }),
    },
    valueAxis: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.seriesParam.valueAxis.help', {
        defaultMessage: 'Name of value axis',
      }),
    },
  },
  fn: (context, args) => {
    return {
      type: 'series_param',
      data: { label: args.label, id: args.id },
      drawLinesBetweenPoints: args.drawLinesBetweenPoints,
      interpolate: args.interpolate,
      lineWidth: args.lineWidth,
      mode: args.mode,
      show: args.show,
      showCircles: args.showCircles,
      circlesRadius: args.circlesRadius,
      seriesParamType: args.type,
      valueAxis: args.valueAxis,
    };
  },
});
