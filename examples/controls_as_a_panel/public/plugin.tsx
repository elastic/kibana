/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { ADD_PANEL_TRIGGER, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ADD_CONTROL_PANEL_ACTION_ID, CONTROL_PANEL_ID } from './control_group/constants';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  embeddable: EmbeddableSetup;
}

export interface ControlsExampleStartDeps {
  uiActions: UiActionsStart;
}

export class ControlsAsAPanelExamplePlugin
  implements Plugin<void, void, SetupDeps, ControlsExampleStartDeps>
{
  public setup(core: CoreSetup<ControlsExampleStartDeps>, { embeddable }: SetupDeps) {
    embeddable.registerReactEmbeddableFactory(CONTROL_PANEL_ID, async () => {
      const { controlPanelEmbeddableFactory } = await import(
        './control_group/control_group_embeddable'
      );
      return controlPanelEmbeddableFactory;
    });
  }

  public start(core: CoreStart, deps: ControlsExampleStartDeps) {
    deps.uiActions.registerActionAsync(ADD_CONTROL_PANEL_ACTION_ID, async () => {
      const { AddControlPanelAction } = await import('./control_group/add_control_panel_action');
      return new AddControlPanelAction();
    });
    deps.uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_CONTROL_PANEL_ACTION_ID);
  }

  public stop() {}
}
