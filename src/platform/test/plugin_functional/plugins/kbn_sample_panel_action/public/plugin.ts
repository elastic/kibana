/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, Plugin } from '@kbn/core/public';
import { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';

export const SAMPLE_PANEL_ACTION = 'SAMPLE_PANEL_ACTION';
export const SAMPLE_PANEL_LINK = 'SAMPLE_PANEL_LINK';

export class SamplePanelActionTestPlugin
  implements Plugin<SamplePanelActionTestPluginSetup, SamplePanelActionTestPluginStart>
{
  public setup(core: CoreSetup, { uiActions }: { uiActions: UiActionsSetup }) {
    uiActions.addTriggerActionAsync(CONTEXT_MENU_TRIGGER, SAMPLE_PANEL_ACTION, async () => {
      const { createSamplePanelAction } = await import('./sample_panel_action');
      return createSamplePanelAction(core.getStartServices);
    });
    uiActions.addTriggerActionAsync(CONTEXT_MENU_TRIGGER, SAMPLE_PANEL_LINK, async () => {
      const { createSamplePanelLink } = await import('./sample_panel_link');
      return createSamplePanelLink();
    });

    return {};
  }

  public start() {}
  public stop() {}
}

export type SamplePanelActionTestPluginSetup = ReturnType<SamplePanelActionTestPlugin['setup']>;
export type SamplePanelActionTestPluginStart = ReturnType<SamplePanelActionTestPlugin['start']>;
