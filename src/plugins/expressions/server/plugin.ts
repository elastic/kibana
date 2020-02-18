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

import { CoreStart, PluginInitializerContext, CoreSetup, Plugin } from 'src/core/server';
import { BfetchServerSetup, BfetchServerStart } from '../../bfetch/server';
import {
  LegacyInterpreterServerApi,
  createLegacyServerInterpreterApi,
  createLegacyServerEndpoints,
} from './legacy';
import { ExpressionsService } from '../common';

// eslint-disable-next-line
export interface ExpressionsServerSetupDependencies {
  bfetch: BfetchServerSetup;
}

// eslint-disable-next-line
export interface ExpressionsServerStartDependencies {
  bfetch: BfetchServerStart;
}

export interface ExpressionsServerSetup {
  __LEGACY: LegacyInterpreterServerApi;
}

// eslint-disable-next-line
export interface ExpressionsServerStart {}

export class ExpressionsServerPlugin
  implements
    Plugin<
      ExpressionsServerSetup,
      ExpressionsServerStart,
      ExpressionsServerSetupDependencies,
      ExpressionsServerStartDependencies
    > {
  readonly expressions: ExpressionsService = new ExpressionsService();

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup,
    plugins: ExpressionsServerSetupDependencies
  ): ExpressionsServerSetup {
    const logger = this.initializerContext.logger.get();
    const { expressions } = this;
    const { executor } = expressions;

    executor.extendContext({
      environment: 'server',
    });

    const legacyApi = createLegacyServerInterpreterApi();
    createLegacyServerEndpoints(legacyApi, logger, core, plugins);

    return {
      __LEGACY: legacyApi,
    };
  }

  public start(
    core: CoreStart,
    plugins: ExpressionsServerStartDependencies
  ): ExpressionsServerStart {
    return {};
  }

  public stop() {}
}
