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

import { mapValues } from 'lodash';
import {
  AnyExpressionFunctionDefinition,
  ExpressionFunctionDefinition,
  ExecutionContext,
} from 'src/plugins/expressions/common';

/**
 * Takes a function spec and passes in default args,
 * overriding with any provided args.
 *
 * Similar to the test helper used in Expressions & Canvas,
 * however in this case we are ignoring the input & execution
 * context, as they are not applicable to the agg type
 * expression functions.
 */
export const functionWrapper = <T extends AnyExpressionFunctionDefinition>(spec: T) => {
  const defaultArgs = mapValues(spec.args, (argSpec) => argSpec.default);
  return (
    args: T extends ExpressionFunctionDefinition<
      infer Name,
      infer Input,
      infer Arguments,
      infer Output,
      infer Context
    >
      ? Arguments
      : never
  ) => spec.fn(null, { ...defaultArgs, ...args }, {} as ExecutionContext);
};
