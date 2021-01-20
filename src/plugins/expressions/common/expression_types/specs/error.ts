/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';
import { ExpressionValueRender } from './render';
import { getType } from '../get_type';
import { SerializableState } from '../../../../kibana_utils/common';
import { ErrorLike } from '../../util';

const name = 'error';

export type ExpressionValueError = ExpressionValueBoxed<
  'error',
  {
    error: ErrorLike;
    info?: SerializableState;
  }
>;

export const isExpressionValueError = (value: any): value is ExpressionValueError =>
  getType(value) === 'error';

/**
 * @deprecated
 *
 * Exported for backwards compatibility.
 */
export type InterpreterErrorType = ExpressionValueError;

export const error: ExpressionTypeDefinition<'error', ExpressionValueError> = {
  name,
  to: {
    render: (input): ExpressionValueRender<Pick<InterpreterErrorType, 'error' | 'info'>> => {
      return {
        type: 'render',
        as: name,
        value: {
          error: input.error,
          info: input.info,
        },
      };
    },
  },
};
