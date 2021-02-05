/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';

import { VisTypeXyPluginSetup } from 'src/plugins/vis_type_xy/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { BaseVisTypeOptions, VisualizationsSetup } from '../../visualizations/public';
import { createVisTypeVislibVisFn } from './vis_type_vislib_vis_fn';
import { createPieVisFn } from './pie_fn';
import { visLibVisTypeDefinitions, pieVisTypeDefinition } from './vis_type_vislib_vis_types';
import { ChartsPluginSetup } from '../../charts/public';
import { DataPublicPluginStart } from '../../data/public';
import { KibanaLegacyStart } from '../../kibana_legacy/public';
import { setFormatService, setDataActions } from './services';
import { getVislibVisRenderer } from './vis_renderer';
import { BasicVislibParams } from './types';

/** @internal */
export interface VisTypeVislibPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
  visTypeXy?: VisTypeXyPluginSetup;
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
    { expressions, visualizations, charts, visTypeXy }: VisTypeVislibPluginSetupDependencies
  ) {
    // if visTypeXy plugin is disabled it's config will be undefined
    if (!visTypeXy) {
      const convertedTypes: Array<BaseVisTypeOptions<BasicVislibParams>> = [];
      const convertedFns: any[] = [];

      // Register legacy vislib types that have been converted
      convertedFns.forEach(expressions.registerFunction);
      convertedTypes.forEach(visualizations.createBaseVisualization);
      expressions.registerRenderer(getVislibVisRenderer(core, charts));
    }
    // Register non-converted types
    visLibVisTypeDefinitions.forEach(visualizations.createBaseVisualization);
    visualizations.createBaseVisualization(pieVisTypeDefinition);
    expressions.registerRenderer(getVislibVisRenderer(core, charts));
    [createVisTypeVislibVisFn(), createPieVisFn()].forEach(expressions.registerFunction);
  }

  public start(core: CoreStart, { data }: VisTypeVislibPluginStartDependencies) {
    setFormatService(data.fieldFormats);
    setDataActions(data.actions);
  }
}
