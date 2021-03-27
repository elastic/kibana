/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionTypeDefinition } from '../types';
import { ExpressionValueRender } from './render';

const name = 'flow';

export const flow: ExpressionTypeDefinition<typeof name, ExpressionValueRender<any>> = {
  name: 'flow',
  to: {
    render: (input) => {
      return {
        type: 'render',
        as: name,
        value: input,
      };
    },
  },
};
