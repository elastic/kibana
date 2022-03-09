/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { KibanaContext } from '../../../data/public';
import { ExpressionFunctionDefinition, Render } from '../../../expressions/public';

import type { TimeseriesVisData } from '../common/types';
import { metricsRequestHandler } from './request_handler';
import { TimeseriesVisParams } from './types';

type Input = KibanaContext | null;
type Output = Promise<Render<TimeseriesRenderValue>>;

interface Arguments {
  params: string;
  uiState: string;
}

export interface TimeseriesRenderValue {
  visData: TimeseriesVisData | {};
  visParams: TimeseriesVisParams;
  syncColors: boolean;
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
  async fn(
    input,
    args,
    {
      getSearchSessionId,
      isSyncColorsEnabled,
      getExecutionContext,
      inspectorAdapters,
      abortSignal: expressionAbortSignal,
    }
  ) {
    const visParams: TimeseriesVisParams = JSON.parse(args.params);
    const uiState = JSON.parse(args.uiState);
    const syncColors = isSyncColorsEnabled?.() ?? false;

    const response = await metricsRequestHandler({
      input,
      visParams,
      uiState,
      searchSessionId: getSearchSessionId(),
      executionContext: getExecutionContext(),
      inspectorAdapters,
      expressionAbortSignal,
    });

    return {
      type: 'render',
      as: 'timeseries_vis',
      value: {
        visParams,
        visData: response,
        syncColors,
      },
    };
  },
});
