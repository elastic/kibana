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
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { Plugin as DataPublicPlugin } from '../../data/public';
import { VisualizationsSetup } from '../../visualizations/public';
import {
  setNotifications,
  setData,
  setSavedObjects,
  setInjectedVars,
  setUISettings,
  setKibanaMapFactory,
  setMapsLegacyConfig,
  setInjectedMetadata,
} from './services';

import { createVegaFn } from './vega_fn';
import { createVegaTypeDefinition } from './vega_type';
import { IServiceSettings } from '../../maps_legacy/public';
import './index.scss';
import { ConfigSchema } from '../config';

/** @internal */
export interface VegaVisualizationDependencies {
  core: CoreSetup;
  plugins: {
    data: ReturnType<DataPublicPlugin['setup']>;
  };
  serviceSettings: IServiceSettings;
}

/** @internal */
export interface VegaPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  data: ReturnType<DataPublicPlugin['setup']>;
  mapsLegacy: any;
}

/** @internal */
export interface VegaPluginStartDependencies {
  data: ReturnType<DataPublicPlugin['start']>;
}

/** @internal */
export class VegaPlugin implements Plugin<Promise<void>, void> {
  initializerContext: PluginInitializerContext<ConfigSchema>;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public async setup(
    core: CoreSetup,
    { data, expressions, visualizations, mapsLegacy }: VegaPluginSetupDependencies
  ) {
    setInjectedVars({
      enableExternalUrls: this.initializerContext.config.get().enableExternalUrls,
      esShardTimeout: core.injectedMetadata.getInjectedVar('esShardTimeout') as number,
      emsTileLayerId: core.injectedMetadata.getInjectedVar('emsTileLayerId', true),
    });
    setUISettings(core.uiSettings);
    setKibanaMapFactory(mapsLegacy.getKibanaMapFactoryProvider);
    setMapsLegacyConfig(mapsLegacy.config);

    const visualizationDependencies: Readonly<VegaVisualizationDependencies> = {
      core,
      plugins: {
        data,
      },
      serviceSettings: mapsLegacy.serviceSettings,
    };

    expressions.registerFunction(() => createVegaFn(visualizationDependencies));

    visualizations.createBaseVisualization(createVegaTypeDefinition(visualizationDependencies));
  }

  public start(core: CoreStart, { data }: VegaPluginStartDependencies) {
    setNotifications(core.notifications);
    setSavedObjects(core.savedObjects);
    setData(data);
    setInjectedMetadata(core.injectedMetadata);
  }
}
