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
