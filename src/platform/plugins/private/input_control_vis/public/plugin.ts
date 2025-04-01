/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  UnifiedSearchPublicPluginStart,
  UnifiedSearchPluginSetup,
} from '@kbn/unified-search-plugin/public';
import { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import { VisualizationsSetup, VisualizationsStart } from '@kbn/visualizations-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { PANEL_BADGE_TRIGGER } from '@kbn/embeddable-plugin/public';
import { createInputControlVisFn } from './input_control_fn';
import { getInputControlVisRenderer } from './input_control_vis_renderer';
import { createInputControlVisTypeDefinition } from './input_control_vis_type';
import type { InputControlPublicConfig } from '../server/config';
import { InputControlDeprecationBadge } from './deprecation_badge';

type InputControlVisCoreSetup = CoreSetup<InputControlVisPluginStartDependencies, void>;

export interface InputControlSettings {
  autocompleteTimeout: number;
  autocompleteTerminateAfter: number;
}

export interface InputControlVisDependencies {
  core: InputControlVisCoreSetup;
  data: DataPublicPluginSetup;
  unifiedSearch: UnifiedSearchPluginSetup;
  getSettings: () => Promise<InputControlSettings>;
}

/** @internal */
export interface InputControlVisPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  data: DataPublicPluginSetup;
  unifiedSearch: UnifiedSearchPluginSetup;
}

/** @internal */
export interface InputControlVisPluginStartDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['start']>;
  visualizations: VisualizationsStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  uiActions: UiActionsStart;
}

/** @internal */
export class InputControlVisPlugin implements Plugin<void, void> {
  constructor(public initializerContext: PluginInitializerContext<InputControlPublicConfig>) {}

  public setup(
    core: InputControlVisCoreSetup,
    { expressions, visualizations, unifiedSearch, data }: InputControlVisPluginSetupDependencies
  ) {
    const visualizationDependencies: Readonly<InputControlVisDependencies> = {
      core,
      unifiedSearch,
      getSettings: async () => {
        const { timeout, terminateAfter } = unifiedSearch.autocomplete.getAutocompleteSettings();
        return { autocompleteTimeout: timeout, autocompleteTerminateAfter: terminateAfter };
      },
      data,
    };

    expressions.registerFunction(createInputControlVisFn);
    expressions.registerRenderer(getInputControlVisRenderer(visualizationDependencies));
    const { readOnly } = this.initializerContext.config.get<InputControlPublicConfig>();
    visualizations.createBaseVisualization(
      createInputControlVisTypeDefinition(visualizationDependencies, Boolean(readOnly))
    );
  }

  public start(core: CoreStart, deps: InputControlVisPluginStartDependencies) {
    // nothing to do here
    const { uiActions } = deps;

    const deprecationBadge = new InputControlDeprecationBadge();

    uiActions.addTriggerAction(PANEL_BADGE_TRIGGER, deprecationBadge);

    return {};
  }
}
