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

import { i18n } from '@kbn/i18n';
import { ExpressionTypeDefinition } from '../types';
import { Datatable } from './datatable';
import { ExpressionValueRender } from './render';

const name = 'number';

export const number: ExpressionTypeDefinition<typeof name, number> = {
  name,
  from: {
    null: () => 0,
    boolean: (b) => Number(b),
    string: (n) => {
      const value = Number(n);
      if (Number.isNaN(value)) {
        throw new Error(
          i18n.translate('expressions.types.number.fromStringConversionErrorMessage', {
            defaultMessage: 'Can\'t typecast "{string}" string to number',
            values: {
              string: n,
            },
          })
        );
      }
      return value;
    },
  },
  to: {
    render: (value: number): ExpressionValueRender<{ text: string }> => {
      const text = `${value}`;
      return {
        type: 'render',
        as: 'text',
        value: { text },
      };
    },
    datatable: (value): Datatable => ({
      type: 'datatable',
      columns: [{ name: 'value', type: 'number' }],
      rows: [{ value }],
    }),
  },
};
