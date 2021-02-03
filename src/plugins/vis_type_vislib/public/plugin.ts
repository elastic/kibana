/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';

import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup } from '../../visualizations/public';
import { ChartsPluginSetup } from '../../charts/public';
import { DataPublicPluginStart } from '../../data/public';
import { KibanaLegacyStart } from '../../kibana_legacy/public';
import { LEGACY_CHARTS_LIBRARY } from '../../vis_type_xy/public';

import { createVisTypeVislibVisFn } from './vis_type_vislib_vis_fn';
import { createPieVisFn } from './pie_fn';
import {
  convertedTypeDefinitions,
  pieVisTypeDefinition,
  visLibVisTypeDefinitions,
} from './vis_type_vislib_vis_types';
import { setFormatService, setDataActions } from './services';
import { getVislibVisRenderer } from './vis_renderer';

/** @internal */
export interface VisTypeVislibPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface VisTypeVislibPluginStartDependencies {
  data: DataPublicPluginStart;
  kibanaLegacy: KibanaLegacyStart;
}

export type VisTypeVislibCoreSetup = CoreSetup<VisTypeVislibPluginStartDependencies, void>;

/** @internal */
export class VisTypeVislibPlugin
  implements
    Plugin<void, void, VisTypeVislibPluginSetupDependencies, VisTypeVislibPluginStartDependencies> {
  constructor(public initializerContext: PluginInitializerContext) {}

  public async setup(
    core: VisTypeVislibCoreSetup,
    { expressions, visualizations, charts }: VisTypeVislibPluginSetupDependencies
  ) {
    if (!core.uiSettings.get(LEGACY_CHARTS_LIBRARY, false)) {
      // Register only non-replaced vis types
      convertedTypeDefinitions.forEach(visualizations.createBaseVisualization);
      visualizations.createBaseVisualization(pieVisTypeDefinition);
      expressions.registerRenderer(getVislibVisRenderer(core, charts));
      [createVisTypeVislibVisFn(), createPieVisFn()].forEach(expressions.registerFunction);
    } else {
      // Register all vis types
      visLibVisTypeDefinitions.forEach(visualizations.createBaseVisualization);
      visualizations.createBaseVisualization(pieVisTypeDefinition);
      expressions.registerRenderer(getVislibVisRenderer(core, charts));
      [createVisTypeVislibVisFn(), createPieVisFn()].forEach(expressions.registerFunction);
    }
  }

  public start(core: CoreStart, { data }: VisTypeVislibPluginStartDependencies) {
    setFormatService(data.fieldFormats);
    setDataActions(data.actions);
  }
}
