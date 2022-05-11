/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { ExpressionFunctionDefinition, Datatable, Render } from '@kbn/expressions-plugin/public';
import { InputControlVisParams } from './types';

interface Arguments {
  visConfig: string;
}

export interface InputControlRenderValue {
  visType: 'input_control_vis';
  visConfig: InputControlVisParams;
}

export type InputControlExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'input_control_vis',
  Datatable,
  Arguments,
  Render<InputControlRenderValue>
>;

export const createInputControlVisFn = (): InputControlExpressionFunctionDefinition => ({
  name: 'input_control_vis',
  type: 'render',
  inputTypes: [],
  help: i18n.translate('inputControl.function.help', {
    defaultMessage: 'Input control visualization',
  }),
  args: {
    visConfig: {
      types: ['string'],
      default: '"{}"',
      help: '',
    },
  },
  fn(input, args) {
    const params: InputControlVisParams = JSON.parse(args.visConfig);
    return {
      type: 'render',
      as: 'input_control_vis',
      value: {
        visType: 'input_control_vis',
        visConfig: params,
      },
    };
  },
});
