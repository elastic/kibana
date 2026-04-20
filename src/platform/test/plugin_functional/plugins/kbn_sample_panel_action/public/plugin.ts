/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import { ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { SAMPLE_PANEL_ACTION, SAMPLE_PANEL_LINK } from './constants';

export class SampelPanelActionTestPlugin
  implements Plugin<SampelPanelActionTestPluginSetup, SampelPanelActionTestPluginStart>
{
  public setup(core: CoreSetup, { uiActions }: { uiActions: UiActionsSetup }) {
    uiActions.addTriggerActionAsync(ON_OPEN_PANEL_MENU, SAMPLE_PANEL_ACTION, async () => {
      const { createSamplePanelAction } = await import('./sample_panel_action');
      return createSamplePanelAction(core.getStartServices);
    });
    uiActions.addTriggerActionAsync(ON_OPEN_PANEL_MENU, SAMPLE_PANEL_LINK, async () => {
      const { createSamplePanelLink } = await import('./sample_panel_link');
      return createSamplePanelLink();
    });

    return {};
  }

  public start() {}
  public stop() {}
}

export type SampelPanelActionTestPluginSetup = ReturnType<SampelPanelActionTestPlugin['setup']>;
export type SampelPanelActionTestPluginStart = ReturnType<SampelPanelActionTestPlugin['start']>;
