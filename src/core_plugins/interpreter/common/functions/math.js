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

import { evaluate } from 'tinymath';
import { pivotObjectArray } from '@kbn/interpreter/common/lib/pivot_object_array';

export const math = () => ({
  name: 'math',
  type: 'number',
  help:
    'Interpret a math expression, with a number or datatable as context. Datatable columns are available by their column name. ' +
    'If you pass in a number it is available as "value" (without the quotes)',
  context: {
    types: ['number', 'datatable'],
  },
  args: {
    expression: {
      aliases: ['_'],
      types: ['string'],
      help:
        'An evaluated TinyMath expression. (See [TinyMath Functions](http://canvas.elastic.co/reference/tinymath.html))',
    },
  },
  fn: (context, args) => {
    if (!args.expression || args.expression.trim() === '') throw new Error('Empty expression');

    const isDatatable = context && context.type === 'datatable';
    const mathContext = isDatatable
      ? pivotObjectArray(context.rows, context.columns.map(col => col.name))
      : { value: context };
    try {
      const result = evaluate(args.expression, mathContext);
      if (Array.isArray(result)) {
        if (result.length === 1) return result[0];
        throw new Error(
          'Expressions must return a single number. Try wrapping your expression in mean() or sum()'
        );
      }
      if (isNaN(result)) {
        throw new Error('Failed to execute math expression. Check your column names');
      }
      return result;
    } catch (e) {
      if (context.rows.length === 0) throw new Error('Empty datatable');
      else throw e;
    }
  },
});
