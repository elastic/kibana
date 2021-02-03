/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ExecutionContextSearch } from '../../data/public';
import { ExecutionContext, ExpressionFunctionDefinition, Render } from '../../expressions/public';
import { VegaVisualizationDependencies } from './plugin';
import { createVegaRequestHandler } from './vega_request_handler';
import { VegaInspectorAdapters } from './vega_inspector/index';
import { KibanaContext, TimeRange, Query } from '../../data/public';
import { VegaParser } from './data_model/vega_parser';

type Input = KibanaContext | null;
type Output = Promise<Render<RenderValue>>;

interface Arguments {
  spec: string;
}

export type VisParams = Required<Arguments>;

export interface RenderValue {
  visData: VegaParser;
  visType: 'vega';
  visConfig: VisParams;
}

export type VegaExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'vega',
  Input,
  Arguments,
  Output,
  ExecutionContext<VegaInspectorAdapters, ExecutionContextSearch>
>;

export const createVegaFn = (
  dependencies: VegaVisualizationDependencies
): VegaExpressionFunctionDefinition => ({
  name: 'vega',
  type: 'render',
  inputTypes: ['kibana_context', 'null'],
  help: i18n.translate('visTypeVega.function.help', {
    defaultMessage: 'Vega visualization',
  }),
  args: {
    spec: {
      types: ['string'],
      default: '',
      help: '',
    },
  },
  async fn(input, args, context) {
    const vegaRequestHandler = createVegaRequestHandler(dependencies, context);

    const response = await vegaRequestHandler({
      timeRange: get(input, 'timeRange') as TimeRange,
      query: get(input, 'query') as Query,
      filters: get(input, 'filters') as any,
      visParams: { spec: args.spec },
      searchSessionId: context.getSearchSessionId(),
    });

    return {
      type: 'render',
      as: 'vega_vis',
      value: {
        visData: response,
        visType: 'vega',
        visConfig: {
          spec: args.spec,
        },
      },
    };
  },
});
