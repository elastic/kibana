/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin,
  IUiSettingsClient,
  PluginInitializerContext,
} from 'kibana/public';

import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup, VisualizationsStart } from '../../visualizations/public';
import { ChartsPluginSetup } from '../../charts/public';

export interface VisTypeXyDependencies {
  uiSettings: IUiSettingsClient;
  charts: ChartsPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisTypeXyPluginSetup {}

/** @internal */
export interface VisTypeXyPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface VisTypeXyPluginStartDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['start']>;
  visualizations: VisualizationsStart;
}

type VisTypeXyCoreSetup = CoreSetup<VisTypeXyPluginStartDependencies, void>;

/** @internal */
export class VisTypeXyPlugin implements Plugin<VisTypeXyPluginSetup, void> {
  constructor(public initializerContext: PluginInitializerContext) {}

  public async setup(
    core: VisTypeXyCoreSetup,
    { expressions, visualizations, charts }: VisTypeXyPluginSetupDependencies
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      'The visTypeXy plugin is enabled\n\n',
      'This may negatively alter existing vislib visualization configurations if saved.'
    );
    const visualizationDependencies: Readonly<VisTypeXyDependencies> = {
      uiSettings: core.uiSettings,
      charts,
    };

    const visTypeDefinitions: any[] = [];
    const visFunctions: any = [];

    visFunctions.forEach((fn: any) => expressions.registerFunction(fn));
    visTypeDefinitions.forEach((vis: any) =>
      visualizations.createBaseVisualization(vis(visualizationDependencies))
    );

    return {};
  }

  public start(core: CoreStart, deps: VisTypeXyPluginStartDependencies) {
    // nothing to do here
  }
}
