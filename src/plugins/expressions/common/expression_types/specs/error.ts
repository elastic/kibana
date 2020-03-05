/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';
import { ExpressionValueRender } from './render';
import { getType } from '../get_type';

const name = 'error';

export type ExpressionValueError = ExpressionValueBoxed<
  'error',
  {
    error: {
      message: string;
      name?: string;
      stack?: string;
    };
    info: unknown;
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
