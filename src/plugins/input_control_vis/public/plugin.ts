/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'kibana/public';

import { DataPublicPluginSetup, DataPublicPluginStart } from 'src/plugins/data/public';
import { UnifiedSearchPublicPluginStart } from 'src/plugins/unified_search/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup, VisualizationsStart } from '../../visualizations/public';
import { createInputControlVisFn } from './input_control_fn';
import { getInputControlVisRenderer } from './input_control_vis_renderer';
import { createInputControlVisTypeDefinition } from './input_control_vis_type';

type InputControlVisCoreSetup = CoreSetup<InputControlVisPluginStartDependencies, void>;

export interface InputControlSettings {
  autocompleteTimeout: number;
  autocompleteTerminateAfter: number;
}

export interface InputControlVisDependencies {
  core: InputControlVisCoreSetup;
  data: DataPublicPluginSetup;
  getSettings: () => Promise<InputControlSettings>;
}

/** @internal */
export interface InputControlVisPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  data: DataPublicPluginSetup;
}

/** @internal */
export interface InputControlVisPluginStartDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['start']>;
  visualizations: VisualizationsStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

/** @internal */
export class InputControlVisPlugin implements Plugin<void, void> {
  constructor(public initializerContext: PluginInitializerContext) {}

  public setup(
    core: InputControlVisCoreSetup,
    { expressions, visualizations, data }: InputControlVisPluginSetupDependencies
  ) {
    const visualizationDependencies: Readonly<InputControlVisDependencies> = {
      core,
      data,
      getSettings: async () => {
        const { timeout, terminateAfter } = data.autocomplete.getAutocompleteSettings();
        return { autocompleteTimeout: timeout, autocompleteTerminateAfter: terminateAfter };
      },
    };

    expressions.registerFunction(createInputControlVisFn);
    expressions.registerRenderer(getInputControlVisRenderer(visualizationDependencies));
    visualizations.createBaseVisualization(
      createInputControlVisTypeDefinition(visualizationDependencies)
    );
  }

  public start(core: CoreStart, deps: InputControlVisPluginStartDependencies) {
    // nothing to do here
  }
}
