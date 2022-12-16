/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';
import { ExpressionValueRender } from './render';
import { getType } from '../get_type';
import { ErrorLike } from '../../util';

const name = 'error';

export type ExpressionValueError = ExpressionValueBoxed<
  'error',
  {
    error: ErrorLike;
    info?: SerializableRecord;
  }
>;

export const isExpressionValueError = (value: unknown): value is ExpressionValueError => {
  try {
    return getType(value) === 'error';
  } catch (e) {
    // nothing to be here
  }
  return false;
};

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
