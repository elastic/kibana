/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionTypeDefinition } from '../types';
import { ExpressionTypeStyle } from '../../types/style';

const name = 'style';

export const style: ExpressionTypeDefinition<typeof name, ExpressionTypeStyle> = {
  name,
  from: {
    null: () => {
      return {
        type: 'style',
        spec: {},
        css: '',
      };
    },
  },
};
