/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Filter } from '@kbn/es-query';
import { ExpressionFunctionDefinition, Render } from '@kbn/expressions-plugin/public';
import { KibanaContext, Query, TimeRange } from '@kbn/data-plugin/public';
import { TimelionSuccessResponse } from './helpers/timelion_request_handler';
import { TIMELION_VIS_NAME } from './timelion_vis_type';
import { TimelionVisDependencies } from './plugin';

type Input = KibanaContext | null;
type Output = Promise<Render<TimelionRenderValue>>;
export interface TimelionRenderValue {
  visData?: TimelionSuccessResponse;
  visType: 'timelion';
  visParams: TimelionVisParams;
}

export interface TimelionVisParams {
  expression: string;
  interval: string;
  ariaLabel?: string;
}

export type TimelionExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'timelion_vis',
  Input,
  TimelionVisParams,
  Output
>;

export const getTimelionVisualizationConfig = (
  dependencies: TimelionVisDependencies
): TimelionExpressionFunctionDefinition => ({
  name: 'timelion_vis',
  type: 'render',
  inputTypes: ['kibana_context', 'null'],
  help: i18n.translate('timelion.function.help', {
    defaultMessage: 'Timelion visualization',
  }),
  args: {
    expression: {
      types: ['string'],
      aliases: ['_'],
      default: '".es(*)"',
      help: '',
    },
    interval: {
      types: ['string'],
      default: 'auto',
      help: '',
    },
    ariaLabel: {
      types: ['string'],
      help: i18n.translate('timelion.function.args.ariaLabelHelpText', {
        defaultMessage: 'Specifies the aria label of the timelion',
      }),
      required: false,
    },
  },
  async fn(
    input,
    args,
    { getSearchSessionId, getExecutionContext, variables, abortSignal: expressionAbortSignal }
  ) {
    const { getTimelionRequestHandler } = await import('./async_services');
    const visParams = {
      expression: args.expression,
      interval: args.interval,
      ariaLabel:
        args.ariaLabel ??
        (variables?.embeddableTitle as string) ??
        getExecutionContext?.()?.description,
    };
    let visData: TimelionRenderValue['visData'];

    if (!expressionAbortSignal.aborted) {
      const timelionRequestHandler = getTimelionRequestHandler({
        ...dependencies,
        expressionAbortSignal,
      });

      visData = await timelionRequestHandler({
        timeRange: get(input, 'timeRange') as TimeRange,
        query: get(input, 'query') as Query,
        filters: get(input, 'filters') as Filter[],
        visParams,
        searchSessionId: getSearchSessionId(),
        executionContext: getExecutionContext(),
      });

      visData.visType = TIMELION_VIS_NAME;
    }

    return {
      type: 'render',
      as: 'timelion_vis',
      value: {
        visParams,
        visType: TIMELION_VIS_NAME,
        visData,
      },
    };
  },
});
