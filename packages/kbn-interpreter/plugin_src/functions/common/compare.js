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

export const compare = () => ({
  name: 'compare',
  help:
    'Compare the input to something else to determine true or false. Usually used in combination with `{if}`. ' +
    'This only works with primitive types, such as number, string, and boolean.',
  aliases: ['condition'],
  example: 'math "random()" | compare gt this=0.5',
  type: 'boolean',
  context: {
    types: ['null', 'string', 'number', 'boolean'],
  },
  args: {
    op: {
      aliases: ['_'],
      types: ['string'],
      default: 'eq',
      help:
        'The operator to use in the comparison: ' +
        ' eq (equal), ne (not equal), lt (less than), gt (greater than), lte (less than equal), gte (greater than eq)',
    },
    to: {
      aliases: ['this', 'b'],
      help: 'The value to compare the context to, usually returned by a subexpression',
    },
  },
  fn: (context, args) => {
    const a = context;
    const b = args.to;
    const op = args.op;
    const typesMatch = typeof a === typeof b;

    switch (op) {
      case 'eq':
        return a === b;
      case 'ne':
        return a !== b;
      case 'lt':
        if (typesMatch) return a < b;
        return false;
      case 'lte':
        if (typesMatch) return a <= b;
        return false;
      case 'gt':
        if (typesMatch) return a > b;
        return false;
      case 'gte':
        if (typesMatch) return a >= b;
        return false;
      default:
        throw new Error('Invalid compare operator. Use eq, ne, lt, gt, lte, or gte.');
    }

    return false;
  },
});
