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

import { Executor } from '../executor';
import { ExpressionRendererRegistry } from '../expression_renderers';

export interface ExpressionsServiceSetup {
  readonly getFunctions: Executor['getFunctions'];
  readonly registerFunction: Executor['registerFunction'];
  readonly registerRenderer: ExpressionRendererRegistry['register'];
  readonly registerType: Executor['registerType'];
  readonly run: Executor['run'];
}

export interface ExpressionsServiceStart {
  readonly getFunctions: Executor['getFunctions'];
  readonly run: Executor['run'];
}

export class ExpressionsService {
  public readonly executor = Executor.createWithDefaults();
  public readonly renderers = new ExpressionRendererRegistry();

  public setup() {
    const { executor, renderers } = this;

    const getFunctions = executor.getFunctions.bind(executor);
    const registerFunction = executor.registerFunction.bind(executor);
    const registerRenderer = renderers.register.bind(renderers);
    const registerType = executor.registerType.bind(executor);
    const run = executor.run.bind(executor);

    return {
      getFunctions,
      registerFunction,
      registerRenderer,
      registerType,
      run,
    };
  }

  public start() {
    const { executor } = this;

    const getFunctions = executor.getFunctions.bind(executor);
    const run = executor.run.bind(executor);

    return {
      getFunctions,
      run,
    };
  }

  public stop() {}
}
