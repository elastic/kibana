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

import { ExpressionFunctionDefinition } from '../../expression_functions';
import { ExpressionValueNum } from '../../expression_types';

export const mult: ExpressionFunctionDefinition<
  'mult',
  ExpressionValueNum,
  { val: number },
  ExpressionValueNum
> = {
  name: 'mult',
  help: 'This function multiplies input by a number',
  args: {
    val: {
      default: 0,
      help: 'Number to multiply input by',
      types: ['number'],
    },
  },
  fn: ({ value }, args, context) => {
    return {
      type: 'num',
      value: value * args.val,
    };
  },
};
