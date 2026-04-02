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
import { createSamplePanelAction } from './sample_panel_action';
import { createSamplePanelLink } from './sample_panel_link';

export class SampelPanelActionTestPlugin
  implements Plugin<SampelPanelActionTestPluginSetup, SampelPanelActionTestPluginStart>
{
  public setup(core: CoreSetup, { uiActions }: { uiActions: UiActionsSetup }) {
    const samplePanelAction = createSamplePanelAction(core.getStartServices);
    const samplePanelLink = createSamplePanelLink();

    uiActions.addTriggerAction(ON_OPEN_PANEL_MENU, samplePanelAction);
    uiActions.addTriggerAction(ON_OPEN_PANEL_MENU, samplePanelLink);

    return {};
  }

  public start() {}
  public stop() {}
}

export type SampelPanelActionTestPluginSetup = ReturnType<SampelPanelActionTestPlugin['setup']>;
export type SampelPanelActionTestPluginStart = ReturnType<SampelPanelActionTestPlugin['start']>;
