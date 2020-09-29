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
  Logger,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
} from '../../../src/core/server';
import { realTimeExampleSavedObjectType } from './saved_objects';

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface RealTimeExamplePluginSetupDependencies {}

export interface RealTimeExamplePluginStartDependencies {}

export interface RealTimeExamplesPluginSetup {}

export interface RealTimeExamplesPluginStart {}
/* eslint-enable @typescript-eslint/no-empty-interface */

export class RealTimeExamplesPlugin
  implements
    Plugin<
      RealTimeExamplesPluginSetup,
      RealTimeExamplesPluginStart,
      RealTimeExamplePluginSetupDependencies,
      RealTimeExamplePluginStartDependencies
    > {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('plugins', 'tags');
  }

  public setup(
    core: CoreSetup<RealTimeExamplePluginStartDependencies, unknown>,
    plugins: RealTimeExamplePluginSetupDependencies
  ): RealTimeExamplesPluginSetup {
    const { savedObjects } = core;

    this.logger.debug('setup()');

    savedObjects.registerType(realTimeExampleSavedObjectType);

    return {};
  }

  public start(
    core: CoreStart,
    plugins: RealTimeExamplePluginStartDependencies
  ): RealTimeExamplesPluginStart {
    this.logger.debug('start()');

    return {};
  }
}
