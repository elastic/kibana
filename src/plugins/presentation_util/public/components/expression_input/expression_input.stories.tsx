/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { Meta } from '@storybook/react';

import { ExpressionFunction, ExpressionFunctionParameter, Style } from 'src/plugins/expressions';
import { ExpressionInput } from '../expression_input';
import { registerExpressionsLanguage } from './language';

const content: ExpressionFunctionParameter<'string'> = {
  name: 'content',
  required: false,
  help: 'A string of text that contains Markdown. To concatenate, pass the `string` function multiple times.',
  types: ['string'],
  default: '',
  aliases: ['_', 'expression'],
  multi: true,
  resolve: false,
  options: [],
  accepts: () => true,
};

const font: ExpressionFunctionParameter<Style> = {
  name: 'font',
  required: false,
  help: 'The CSS font properties for the content. For example, font-family or font-weight.',
  types: ['style'],
  default: '{font}',
  aliases: [],
  multi: false,
  resolve: true,
  options: [],
  accepts: () => true,
};

const sampleFunctionDef = {
  name: 'markdown',
  type: 'render',
  aliases: [],
  help: 'Adds an element that renders Markdown text. TIP: Use the `markdown` function for single numbers, metrics, and paragraphs of text.',
  args: {
    content,
    font,
  },

  fn: () => ({
    as: 'markdown',
    value: true,
    type: 'render',
  }),
} as unknown as ExpressionFunction;

registerExpressionsLanguage([sampleFunctionDef]);

export default {
  title: 'Expression Input',
  description: '',
  argTypes: {
    isCompact: {
      control: 'boolean',
      defaultValue: false,
    },
  },
  decorators: [
    (storyFn, { globals }) => (
      <div
        style={{
          padding: 40,
          backgroundColor:
            globals.euiTheme === 'v8.dark' || globals.euiTheme === 'v7.dark' ? '#1D1E24' : '#FFF',
        }}
      >
        {storyFn()}
      </div>
    ),
  ],
} as Meta;

export const Example = ({ isCompact }: { isCompact: boolean }) => (
  <ExpressionInput
    expression="markdown"
    height={300}
    onChange={action('onChange')}
    expressionFunctions={[sampleFunctionDef as any]}
    {...{ isCompact }}
  />
);
