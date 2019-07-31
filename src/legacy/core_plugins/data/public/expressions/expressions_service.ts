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

import { npSetup } from 'ui/new_platform';
import { fromExpression, toExpression } from '@kbn/interpreter/common';
// @ts-ignore
import { getInterpreter } from '../../../interpreter/public/interpreter';
import { setInterpreter } from './services';
import { execute } from './lib/execute';
import { loader } from './lib/loader';
import { render } from './lib/render';
import { createRenderer } from './expression_renderer';

/**
 * Expressions Service
 * @internal
 */
export class ExpressionsService {
  public async setup({}) {
    const interpreter = await getInterpreter();
    setInterpreter(interpreter);

    const ExpressionRenderer = createRenderer(loader);

    return {
      interpreter,

      execute,
      render,
      loader,

      fromExpression,
      toExpression,

      registerType: npSetup.plugins.data.expressions.registerType,
      registerFunction: npSetup.plugins.data.expressions.registerFunction,
      registerRenderer: npSetup.plugins.data.expressions.registerRenderer,

      ExpressionRenderer,
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

/** @public */
export type ExpressionsSetup = ReturnType<ExpressionsService['setup']>;
