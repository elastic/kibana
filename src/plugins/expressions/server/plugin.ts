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

import { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from 'src/core/server';
import { ExpressionsService, ExpressionsServiceSetup, ExpressionsServiceStart } from '../common';

export type ExpressionsServerSetup = ExpressionsServiceSetup;

export type ExpressionsServerStart = ExpressionsServiceStart;

export class ExpressionsServerPlugin
  implements Plugin<ExpressionsServerSetup, ExpressionsServerStart> {
  readonly expressions: ExpressionsService = new ExpressionsService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): ExpressionsServerSetup {
    this.expressions.executor.extendContext({
      environment: 'server',
    });

    const setup = this.expressions.setup();

    return Object.freeze(setup);
  }

  public start(core: CoreStart): ExpressionsServerStart {
    const start = this.expressions.start();

    return Object.freeze(start);
  }

  public stop() {
    this.expressions.stop();
  }
}
