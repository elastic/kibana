/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, Render } from 'src/plugins/expressions/public';
import {
  getTimelionRequestHandler,
  TimelionSuccessResponse,
} from './helpers/timelion_request_handler';
import { TIMELION_VIS_NAME } from './timelion_vis_type';
import { TimelionVisDependencies } from './plugin';
import { KibanaContext, Filter, Query, TimeRange } from '../../data/public';

type Input = KibanaContext | null;
type Output = Promise<Render<TimelionRenderValue>>;
export interface TimelionRenderValue {
  visData: TimelionSuccessResponse;
  visType: 'timelion';
  visParams: TimelionVisParams;
}

export interface TimelionVisParams {
  expression: string;
  interval: string;
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
  },
  async fn(input, args, { getSearchSessionId }) {
    const timelionRequestHandler = getTimelionRequestHandler(dependencies);

    const visParams = { expression: args.expression, interval: args.interval };

    const response = await timelionRequestHandler({
      timeRange: get(input, 'timeRange') as TimeRange,
      query: get(input, 'query') as Query,
      filters: get(input, 'filters') as Filter[],
      visParams,
      searchSessionId: getSearchSessionId(),
    });

    response.visType = TIMELION_VIS_NAME;

    return {
      type: 'render',
      as: 'timelion_vis',
      value: {
        visParams,
        visType: TIMELION_VIS_NAME,
        visData: response,
      },
    };
  },
});
