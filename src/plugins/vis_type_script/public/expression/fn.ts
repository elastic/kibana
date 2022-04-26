/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition, Render } from '../../../expressions/public';
import type { Arguments } from '../types';
import type { RenderValue } from './renderer';
import { ExpressionValueSearchContext } from '../../../data/common';

type ScriptVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'scriptVis',
  ExpressionValueSearchContext | null,
  Arguments,
  Render<RenderValue>
>;

export const createScriptVisFn = (): ScriptVisExpressionFunctionDefinition => ({
  name: 'scriptVis',
  type: 'render',
  inputTypes: ['kibana_context', 'null'],
  help: i18n.translate('visTypeMarkdown.function.help', {
    defaultMessage: 'Script-based visualization',
  }),
  args: {
    script: {
      types: ['string'],
      aliases: ['_'],
      required: true,
      help: i18n.translate('visTypeMarkdown.function.markdown.help', {
        defaultMessage: 'Visualization script',
      }),
    },
  },
  fn(input, args) {
    return {
      type: 'render',
      as: 'script_vis',
      value: {
        visType: 'script',
        visParams: {
          script: args.script,
        },
        visSearchContext: {
          timeRange: input?.timeRange,
          query: input?.query,
          filter: input?.filters,
        },
      },
    };
  },
});
