/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExpressionFunctionDefinition } from '../../expression_functions';

export const access: ExpressionFunctionDefinition<'access', unknown, { key: string }, unknown> = {
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
    return !input
      ? input
      : typeof input === 'object'
      ? (input as Record<string, unknown>)[key]
      : input;
  },
};
