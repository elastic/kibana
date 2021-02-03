/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionTypeDefinition } from '../types';
import { ExpressionValueRender } from '.';

const name = 'range';

export interface Range {
  type: typeof name;
  from: number;
  to: number;
  label?: string;
}

export const range: ExpressionTypeDefinition<typeof name, Range> = {
  name,
  from: {
    null: (): Range => {
      return {
        type: 'range',
        from: 0,
        to: 0,
      };
    },
  },
  to: {
    render: (value: Range): ExpressionValueRender<{ text: string }> => {
      const text = value?.label || `from ${value.from} to ${value.to}`;
      return {
        type: 'render',
        as: 'text',
        value: { text },
      };
    },
  },
};
