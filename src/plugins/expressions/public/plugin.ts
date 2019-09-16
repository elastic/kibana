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

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import {
  ExpressionsService,
  ExpressionsSetupContract,
  ExpressionsStartContract,
} from './expressions/expressions_service';

export class ExpressionsPublicPlugin
  implements Plugin<{}, {}, ExpressionsSetupContract, ExpressionsStartContract> {
  private readonly expressions = new ExpressionsService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): ExpressionsSetupContract {
    const expressions = this.expressions.setup();
    return {
      ...expressions,
    };
  }

  public start(core: CoreStart): ExpressionsStartContract {
    const expressions = this.expressions.start();
    return {
      ...expressions,
    };
  }
  public stop() {}
}
