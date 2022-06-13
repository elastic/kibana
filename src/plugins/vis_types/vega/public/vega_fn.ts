/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ExecutionContextSearch } from '@kbn/data-plugin/public';
import {
  ExecutionContext,
  ExpressionFunctionDefinition,
  Render,
} from '@kbn/expressions-plugin/public';
import { KibanaContext, TimeRange, Query } from '@kbn/data-plugin/public';
import { VegaVisualizationDependencies } from './plugin';
import { VegaInspectorAdapters } from './vega_inspector';
import { VegaParser } from './data_model/vega_parser';

type Input = KibanaContext | { type: 'null' };
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
    const { createVegaRequestHandler } = await import('./async_services');
    const vegaRequestHandler = createVegaRequestHandler(dependencies, context);

    const response = await vegaRequestHandler({
      timeRange: get(input, 'timeRange') as TimeRange,
      query: get(input, 'query') as Query,
      filters: get(input, 'filters') as any,
      visParams: { spec: args.spec },
      searchSessionId: context.getSearchSessionId(),
      executionContext: context.getExecutionContext(),
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
