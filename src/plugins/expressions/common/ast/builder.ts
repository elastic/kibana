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

import {
  ExpressionFunctionDefinition,
  ExpressionFunctionDefinitions,
} from '../expression_functions';

/**
 * Example of how an `addFunction` method in the AST builder could
 * be typed to enforce the correct arguments are provided.
 */
export class FakeAstBuilder {
  createFunction<K extends keyof ExpressionFunctionDefinitions>(
    name: K,
    args: ExpressionFunctionDefinitions[K] extends ExpressionFunctionDefinition<
      infer Name,
      infer Input,
      infer Arguments,
      infer Output,
      infer Context
    >
      ? Arguments
      : never
  ) {
    return;
  }
}
