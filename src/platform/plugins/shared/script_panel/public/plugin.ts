/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { ADD_SCRIPT_PANEL_ACTION_ID } from './constants';
import { SCRIPT_PANEL_EMBEDDABLE_TYPE } from '../common/constants';

export interface SetupDeps {
  embeddable: EmbeddableSetup;
}

export interface StartDeps {
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
}

/**
 * Services required by the script panel embeddable runtime.
 */
export interface ScriptPanelServices {
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
}

export class ScriptPanelPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  private servicesPromise?: Promise<ScriptPanelServices>;

  public setup(core: CoreSetup<StartDeps>, { embeddable }: SetupDeps) {
    // Create a promise that resolves with services when start is called
    this.servicesPromise = core.getStartServices().then(([, deps]) => ({
      data: deps.data,
      expressions: deps.expressions,
    }));

    embeddable.registerReactEmbeddableFactory(SCRIPT_PANEL_EMBEDDABLE_TYPE, async () => {
      const [{ getScriptPanelEmbeddableFactory }, services] = await Promise.all([
        import('./script_panel_embeddable'),
        this.servicesPromise!,
      ]);
      return getScriptPanelEmbeddableFactory(services);
    });
  }

  public start(core: CoreStart, deps: StartDeps) {
    deps.uiActions.addTriggerActionAsync(
      ADD_PANEL_TRIGGER,
      ADD_SCRIPT_PANEL_ACTION_ID,
      async () => {
        const { createScriptPanelAction } = await import('./async_services');
        return createScriptPanelAction();
      }
    );
  }

  public stop() {}
}
