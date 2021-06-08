/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ExpressionFunctionDefinition,
  Render,
} from '../../../../src/plugins/expressions/public';

export interface Arguments {
  inputText: string;
  inputColor?: string;
}

export interface DemoRenderValue {
  text: string;
  color: string;
}

export const demoFunction = (): ExpressionFunctionDefinition<
  'demofunction',
  null,
  Arguments,
  Render<DemoRenderValue>
> => ({
  name: 'demofunction',
  help: 'This is a demo function',
  type: 'render',
  args: {
    inputText: {
      types: ['string'],
      help: 'This is the text to be displayed',
      required: true,
    },
    inputColor: {
      types: ['string'],
      help: 'This is the color the text should be',
      required: false,
    },
  },
  fn: (input, args) => {
    return {
      type: 'render',
      as: 'demo',
      value: {
        text: args.inputText,
        color: args.inputColor || 'inherit',
      },
    };
  },
});
