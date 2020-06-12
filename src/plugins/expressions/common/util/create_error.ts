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

import { ExpressionValueError } from '../../common';

type ErrorLike = Partial<Pick<Error, 'name' | 'message' | 'stack'>>;

export const createError = (err: string | ErrorLike): ExpressionValueError => ({
  type: 'error',
  error: {
    stack:
      process.env.NODE_ENV === 'production'
        ? undefined
        : typeof err === 'object'
        ? err.stack
        : undefined,
    message: typeof err === 'string' ? err : String(err.message),
    name: typeof err === 'object' ? err.name || 'Error' : 'Error',
  },
});
