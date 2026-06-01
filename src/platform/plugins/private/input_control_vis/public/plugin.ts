/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  UnifiedSearchPublicPluginStart,
  UnifiedSearchPluginSetup,
} from '@kbn/unified-search-plugin/public';
import type { KqlPluginSetup, KqlPluginStart } from '@kbn/kql/public';
import type { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import type { VisualizationsSetup, VisualizationsStart } from '@kbn/visualizations-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { PANEL_BADGE_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { createInputControlVisFn } from './input_control_fn';
import { getInputControlVisRenderer } from './input_control_vis_renderer';
import { createInputControlVisTypeDefinition } from './input_control_vis_type';
import type { InputControlPublicConfig } from '../server/config';

type InputControlVisCoreSetup = CoreSetup<InputControlVisPluginStartDependencies, void>;

export interface InputControlSettings {
  autocompleteTimeout: number;
  autocompleteTerminateAfter: number;
}

export interface InputControlVisDependencies {
  core: InputControlVisCoreSetup;
  data: DataPublicPluginSetup;
  unifiedSearch: UnifiedSearchPluginSetup;
  kql: KqlPluginSetup;
  getSettings: () => Promise<InputControlSettings>;
}

/** @internal */
export interface InputControlVisPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  data: DataPublicPluginSetup;
  unifiedSearch: UnifiedSearchPluginSetup;
  kql: KqlPluginSetup;
}

/** @internal */
export interface InputControlVisPluginStartDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['start']>;
  visualizations: VisualizationsStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  kql: KqlPluginStart;
  uiActions: UiActionsStart;
}

/** @internal */
export class InputControlVisPlugin implements Plugin<void, void> {
  constructor(public initializerContext: PluginInitializerContext<InputControlPublicConfig>) {}

  public setup(
    core: InputControlVisCoreSetup,
    {
      expressions,
      visualizations,
      unifiedSearch,
      data,
      kql,
    }: InputControlVisPluginSetupDependencies
  ) {
    const visualizationDependencies: Readonly<InputControlVisDependencies> = {
      core,
      unifiedSearch,
      kql,
      getSettings: async () => {
        const { timeout, terminateAfter } = kql.autocomplete.getAutocompleteSettings();
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

  public start(core: CoreStart, { uiActions }: InputControlVisPluginStartDependencies) {
    uiActions.addTriggerActionAsync(PANEL_BADGE_TRIGGER, 'ACTION_DEPRECATION_BADGE', async () => {
      const { inputControlDeprecationBadge } = await import('./deprecation_badge');
      return inputControlDeprecationBadge;
    });

    return {};
  }
}
