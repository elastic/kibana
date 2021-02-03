/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { KibanaContext } from '../../data/public';
import { ExpressionFunctionDefinition, Render } from '../../expressions/public';

import { PanelSchema, TimeseriesVisData } from '../common/types';
import { metricsRequestHandler } from './request_handler';

type Input = KibanaContext | null;
type Output = Promise<Render<TimeseriesRenderValue>>;

interface Arguments {
  params: string;
  uiState: string;
}

export type TimeseriesVisParams = PanelSchema;

export interface TimeseriesRenderValue {
  visData: TimeseriesVisData | {};
  visParams: TimeseriesVisParams;
}

export type TimeseriesExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'tsvb',
  Input,
  Arguments,
  Output
>;

export const createMetricsFn = (): TimeseriesExpressionFunctionDefinition => ({
  name: 'tsvb',
  type: 'render',
  inputTypes: ['kibana_context', 'null'],
  help: i18n.translate('visTypeTimeseries.function.help', {
    defaultMessage: 'TSVB visualization',
  }),
  args: {
    params: {
      types: ['string'],
      default: '"{}"',
      help: '',
    },
    uiState: {
      types: ['string'],
      default: '"{}"',
      help: '',
    },
  },
  async fn(input, args, { getSearchSessionId }) {
    const visParams: TimeseriesVisParams = JSON.parse(args.params);
    const uiState = JSON.parse(args.uiState);

    const response = await metricsRequestHandler({
      input,
      visParams,
      uiState,
      searchSessionId: getSearchSessionId(),
    });

    return {
      type: 'render',
      as: 'timeseries_vis',
      value: {
        visParams,
        visData: response,
      },
    };
  },
});
