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

import { ExpressionType } from '../types';
import { Render } from '.';

const name = 'range';

export interface Range {
  type: typeof name;
  from: number;
  to: number;
}

export const range = (): ExpressionType<typeof name, Range> => ({
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
    render: (value: Range): Render<{ text: string }> => {
      const text = `from ${value.from} to ${value.to}`;
      return {
        type: 'render',
        as: 'text',
        value: { text },
      };
    },
  },
});
