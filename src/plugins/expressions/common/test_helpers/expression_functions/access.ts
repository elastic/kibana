/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionFunctionDefinition } from '../../expression_functions';

export const access: ExpressionFunctionDefinition<'access', any, { key: string }, any> = {
  name: 'access',
  help: 'Access key on input object or return the input, if it is not an object',
  args: {
    key: {
      aliases: ['_'],
      help: 'Key on input object',
      types: ['string'],
    },
  },
  fn: (input, { key }, context) => {
    return !input ? input : typeof input === 'object' ? input[key] : input;
  },
};
