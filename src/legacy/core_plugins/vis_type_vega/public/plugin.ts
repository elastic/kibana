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
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../../core/public';
import { LegacyDependenciesPlugin, LegacyDependenciesPluginSetup } from './shim';
import { Plugin as ExpressionsPublicPlugin } from '../../../../plugins/expressions/public';
import { Plugin as DataPublicPlugin } from '../../../../plugins/data/public';
import { VisualizationsSetup } from '../../visualizations/public';
import {
  setNotifications,
  setData,
  setSavedObjects,
  setInjectedVars,
  setUISettings,
} from './services';

import { createVegaFn } from './vega_fn';
import { createVegaTypeDefinition } from './vega_type';
import { VisTypeVegaSetup } from '../../../../plugins/vis_type_vega/public';

/** @internal */
export interface VegaVisualizationDependencies extends LegacyDependenciesPluginSetup {
  core: CoreSetup;
  plugins: {
    data: ReturnType<DataPublicPlugin['setup']>;
  };
}

/** @internal */
export interface VegaPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  data: ReturnType<DataPublicPlugin['setup']>;
  visTypeVega: VisTypeVegaSetup;
  __LEGACY: LegacyDependenciesPlugin;
}

/** @internal */
export interface VegaPluginStartDependencies {
  data: ReturnType<DataPublicPlugin['start']>;
}

/** @internal */
export class VegaPlugin implements Plugin<Promise<void>, void> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(
    core: CoreSetup,
    { data, expressions, visualizations, visTypeVega, __LEGACY }: VegaPluginSetupDependencies
  ) {
    setInjectedVars({
      enableExternalUrls: visTypeVega.config.enableExternalUrls,
      esShardTimeout: core.injectedMetadata.getInjectedVar('esShardTimeout') as number,
      emsTileLayerId: core.injectedMetadata.getInjectedVar('emsTileLayerId', true),
    });
    setUISettings(core.uiSettings);

    const visualizationDependencies: Readonly<VegaVisualizationDependencies> = {
      core,
      plugins: {
        data,
      },
      ...(await __LEGACY.setup()),
    };

    expressions.registerFunction(() => createVegaFn(visualizationDependencies));

    visualizations.types.createBaseVisualization(
      createVegaTypeDefinition(visualizationDependencies)
    );
  }

  public start(core: CoreStart, { data }: VegaPluginStartDependencies) {
    setNotifications(core.notifications);
    setSavedObjects(core.savedObjects);
    setData(data);
  }
}
