/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../data/public';
import { VisualizationsSetup } from '../../visualizations/public';
import { Setup as InspectorSetup } from '../../inspector/public';

import {
  setNotifications,
  setData,
  setInjectedVars,
  setUISettings,
  setMapsLegacyConfig,
  setInjectedMetadata,
} from './services';

import { createVegaFn } from './vega_fn';
import { createVegaTypeDefinition } from './vega_type';
import { IServiceSettings } from '../../maps_legacy/public';
import { ConfigSchema } from '../config';

import { getVegaInspectorView } from './vega_inspector';
import { getVegaVisRenderer } from './vega_vis_renderer';

/** @internal */
export interface VegaVisualizationDependencies {
  core: CoreSetup;
  plugins: {
    data: DataPublicPluginSetup;
  };
  getServiceSettings: () => Promise<IServiceSettings>;
}

/** @internal */
export interface VegaPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  inspector: InspectorSetup;
  data: DataPublicPluginSetup;
  mapsLegacy: any;
}

/** @internal */
export interface VegaPluginStartDependencies {
  data: DataPublicPluginStart;
}

/** @internal */
export class VegaPlugin implements Plugin<Promise<void>, void> {
  initializerContext: PluginInitializerContext<ConfigSchema>;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public async setup(
    core: CoreSetup,
    { inspector, data, expressions, visualizations, mapsLegacy }: VegaPluginSetupDependencies
  ) {
    setInjectedVars({
      enableExternalUrls: this.initializerContext.config.get().enableExternalUrls,
      emsTileLayerId: core.injectedMetadata.getInjectedVar('emsTileLayerId', true),
    });
    setUISettings(core.uiSettings);
    setMapsLegacyConfig(mapsLegacy.config);

    const visualizationDependencies: Readonly<VegaVisualizationDependencies> = {
      core,
      plugins: {
        data,
      },
      getServiceSettings: mapsLegacy.getServiceSettings,
    };

    inspector.registerView(getVegaInspectorView({ uiSettings: core.uiSettings }));

    expressions.registerFunction(() => createVegaFn(visualizationDependencies));
    expressions.registerRenderer(getVegaVisRenderer(visualizationDependencies));

    visualizations.createBaseVisualization(createVegaTypeDefinition(visualizationDependencies));
  }

  public start(core: CoreStart, { data }: VegaPluginStartDependencies) {
    setNotifications(core.notifications);
    setData(data);
    setInjectedMetadata(core.injectedMetadata);
  }
}
