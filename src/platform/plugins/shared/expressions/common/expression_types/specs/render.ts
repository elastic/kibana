/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';

const name = 'render';

/**
 * Represents an object that is intended to be rendered.
 */
export type ExpressionValueRender<T> = ExpressionValueBoxed<
  typeof name,
  {
    as: string;
    value: T;
  }
>;

/**
 * @deprecated
 *
 * Use `ExpressionValueRender` instead.
 */
export type Render<T> = ExpressionValueRender<T>;

export const render: ExpressionTypeDefinition<typeof name, ExpressionValueRender<unknown>> = {
  name,
  from: {
    '*': <T>(v: T): ExpressionValueRender<T> => ({
      type: name,
      as: 'debug',
      value: v,
    }),
  },
};
