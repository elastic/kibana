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
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { TypesService, TypesSetup, TypesStart } from './types';
import { setUISettings, setTypes, setI18n } from './services';

/**
 * Interface for this plugin's returned setup/start contracts.
 *
 * @public
 */
export interface VisualizationsSetup {
  types: TypesSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisualizationsStart {
  types: TypesStart;
}

/**
 * Visualizations Plugin - public
 *
 * This plugin's stateful contracts are returned from the `setup` and `start` methods
 * below. The interfaces for these contracts are provided above.
 *
 * @internal
 */
export class VisualizationsPlugin implements Plugin<VisualizationsSetup, VisualizationsStart> {
  private readonly types: TypesService = new TypesService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    setUISettings(core.uiSettings);
    return {
      types: this.types.setup(),
    };
  }

  public start(core: CoreStart) {
    setI18n(core.i18n);
    const types = this.types.start();
    setTypes(types);
    return {
      types,
    };
  }

  public stop() {
    this.types.stop();
  }
}
