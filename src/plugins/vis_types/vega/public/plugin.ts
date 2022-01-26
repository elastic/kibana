/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../../core/public';
import { Plugin as ExpressionsPublicPlugin } from '../../../expressions/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../data/public';
import { VisualizationsSetup } from '../../../visualizations/public';
import { Setup as InspectorSetup } from '../../../inspector/public';

import {
  setNotifications,
  setData,
  setInjectedVars,
  setUISettings,
  setInjectedMetadata,
  setDocLinks,
  setMapsEms,
} from './services';

import { createVegaFn } from './vega_fn';
import { createVegaTypeDefinition } from './vega_type';
import type { MapsEmsPluginPublicStart } from '../../../maps_ems/public';
import type { IServiceSettings } from './vega_view/vega_map_view/service_settings/service_settings_types';

import { ConfigSchema } from '../config';

import { getVegaInspectorView } from './vega_inspector';
import { getVegaVisRenderer } from './vega_vis_renderer';
import { getServiceSettingsLazy } from './vega_view/vega_map_view/service_settings/get_service_settings_lazy';

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
}

/** @internal */
export interface VegaPluginStartDependencies {
  data: DataPublicPluginStart;
  mapsEms: MapsEmsPluginPublicStart;
}

/** @internal */
export class VegaPlugin implements Plugin<void, void> {
  initializerContext: PluginInitializerContext<ConfigSchema>;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public setup(
    core: CoreSetup,
    { inspector, data, expressions, visualizations }: VegaPluginSetupDependencies
  ) {
    setInjectedVars({
      enableExternalUrls: this.initializerContext.config.get().enableExternalUrls,
      emsTileLayerId: core.injectedMetadata.getInjectedVar('emsTileLayerId', true),
    });

    setUISettings(core.uiSettings);

    const visualizationDependencies: Readonly<VegaVisualizationDependencies> = {
      core,
      plugins: {
        data,
      },
      getServiceSettings: getServiceSettingsLazy,
    };

    inspector.registerView(getVegaInspectorView({ uiSettings: core.uiSettings }));

    expressions.registerFunction(() => createVegaFn(visualizationDependencies));
    expressions.registerRenderer(getVegaVisRenderer(visualizationDependencies));

    visualizations.createBaseVisualization(createVegaTypeDefinition());
  }

  public start(core: CoreStart, { data, mapsEms }: VegaPluginStartDependencies) {
    setNotifications(core.notifications);
    setData(data);
    setInjectedMetadata(core.injectedMetadata);
    setDocLinks(core.docLinks);
    setMapsEms(mapsEms);
  }
}
