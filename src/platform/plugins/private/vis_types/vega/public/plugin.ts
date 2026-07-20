/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import type {
  Setup as InspectorSetup,
  Start as InspectorStart,
} from '@kbn/inspector-plugin/public';

import type { MapsEmsPluginPublicStart } from '@kbn/maps-ems-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  ADD_CANVAS_ELEMENT_TRIGGER,
  ADD_PANEL_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import {
  setNotifications,
  setData,
  setDataViews,
  setInjectedVars,
  setThemeService,
  setDocLinks,
  setMapsEms,
  setUsageCollectionStart,
  setHttp,
} from './services';

import type { IServiceSettings } from './vega_view/vega_map_view/service_settings/service_settings_types';

import type { ConfigSchema } from '../server/config';

import { getVegaInspectorView } from './vega_inspector';
import { getServiceSettingsLazy } from './vega_view/vega_map_view/service_settings/get_service_settings_lazy';
import { VEGA_EMBEDDABLE_TYPE } from '../common/constants';

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
  embeddable: EmbeddableSetup;
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  inspector: InspectorSetup;
  data: DataPublicPluginSetup;
}

/** @internal */
export interface VegaPluginStartDependencies {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  expressions: ReturnType<ExpressionsPublicPlugin['start']>;
  mapsEms: MapsEmsPluginPublicStart;
  dataViews: DataViewsPublicPluginStart;
  uiActions: UiActionsStart;
  usageCollection: UsageCollectionStart;
  inspector: InspectorStart;
}

/** @internal */
export class VegaPlugin implements Plugin<void, void> {
  initializerContext: PluginInitializerContext<ConfigSchema>;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public setup(
    core: CoreSetup<VegaPluginStartDependencies>,
    { embeddable, inspector, data, expressions, visualizations }: VegaPluginSetupDependencies
  ) {
    setInjectedVars({
      enableExternalUrls: this.initializerContext.config.get().enableExternalUrls,
    });

    const visualizationDependencies: Readonly<VegaVisualizationDependencies> = {
      core,
      plugins: {
        data,
      },
      getServiceSettings: getServiceSettingsLazy,
    };

    inspector.registerView(getVegaInspectorView({ uiSettings: core.uiSettings }));

    let runtimePromise:
      | Promise<{ vegaVisType: typeof import('./vega_type').vegaVisType }>
      | undefined;
    const loadVegaRuntime = async () => {
      if (runtimePromise) {
        return runtimePromise;
      }

      runtimePromise = Promise.all([core.getStartServices(), import('./async_module')]).then(
        ([[, startDeps], runtime]) => {
          if (!startDeps.expressions.getFunction('vega')) {
            expressions.registerFunction(() => runtime.createVegaFn(visualizationDependencies));
            expressions.registerRenderer(runtime.getVegaVisRenderer(visualizationDependencies));
          }
          return runtime;
        }
      );
      return runtimePromise;
    };

    visualizations.createBaseVisualizationAsync('vega', async () => {
      const { vegaVisType } = await loadVegaRuntime();
      return vegaVisType;
    });

    embeddable.registerEmbeddablePublicDefinition(VEGA_EMBEDDABLE_TYPE, async () => {
      await loadVegaRuntime();
      const [startCore, startDeps] = await core.getStartServices();
      const { vegaEmbeddableFactory } = await import('./embeddable/vega_embeddable');
      return vegaEmbeddableFactory(startCore, startDeps);
    });
  }

  public start(core: CoreStart, deps: VegaPluginStartDependencies) {
    setNotifications(core.notifications);
    setHttp(core.http);
    setData(deps.data);
    setDataViews(deps.dataViews);
    setDocLinks(core.docLinks);
    setMapsEms(deps.mapsEms);
    setThemeService(core.theme);
    setUsageCollectionStart(deps.usageCollection);

    deps.uiActions.registerActionAsync('addVegaPanelAction', async () => {
      const { getAddVegaPanelAction } = await import('./add_vega_panel_action');
      return getAddVegaPanelAction(deps);
    });
    deps.uiActions.attachAction(ADD_CANVAS_ELEMENT_TRIGGER, 'addVegaPanelAction');

    deps.uiActions.registerActionAsync('addVegaEmbeddableAction', async () => {
      const { getAddVegaEmbeddableAction } = await import(
        './embeddable/add_vega_embeddable_action'
      );
      return getAddVegaEmbeddableAction();
    });
    deps.uiActions.attachAction(ADD_PANEL_TRIGGER, 'addVegaEmbeddableAction');
  }
}
