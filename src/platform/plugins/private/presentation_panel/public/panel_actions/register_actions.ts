/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uiActions } from '../kibana_services';
import { ACTION_EDIT_PANEL } from './edit_panel_action/constants';
import { ACTION_INSPECT_PANEL } from './inspect_panel_action/constants';
import { ACTION_REMOVE_PANEL } from './remove_panel_action/constants';
import {
  ACTION_CUSTOMIZE_PANEL,
  CUSTOM_TIME_RANGE_BADGE,
  CPS_USAGE_OVERRIDES_BADGE,
} from './customize_panel_action/constants';
import { CONTEXT_MENU_TRIGGER, PANEL_BADGE_TRIGGER } from './triggers';
import { ACTION_SHOW_CONFIG_PANEL } from './show_config_panel_action/constants';

export const registerActions = () => {
  uiActions.registerActionAsync(ACTION_REMOVE_PANEL, async () => {
    const { RemovePanelAction } = await import('../panel_component/panel_module');
    return new RemovePanelAction();
  });
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_REMOVE_PANEL);

  uiActions.registerActionAsync(CUSTOM_TIME_RANGE_BADGE, async () => {
    const { CustomTimeRangeBadge } = await import('../panel_component/panel_module');
    return new CustomTimeRangeBadge();
  });
  uiActions.attachAction(PANEL_BADGE_TRIGGER, CUSTOM_TIME_RANGE_BADGE);

  uiActions.registerActionAsync(CPS_USAGE_OVERRIDES_BADGE, async () => {
    const { CpsUsageOverridesBadge } = await import('../panel_component/panel_module');
    return new CpsUsageOverridesBadge();
  });
  uiActions.attachAction(PANEL_BADGE_TRIGGER, CPS_USAGE_OVERRIDES_BADGE);

  uiActions.registerActionAsync(ACTION_INSPECT_PANEL, async () => {
    const { InspectPanelAction } = await import('../panel_component/panel_module');
    return new InspectPanelAction();
  });
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_INSPECT_PANEL);

  uiActions.registerActionAsync(ACTION_EDIT_PANEL, async () => {
    const { EditPanelAction } = await import('../panel_component/panel_module');
    return new EditPanelAction();
  });
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_EDIT_PANEL);

  uiActions.registerActionAsync(ACTION_CUSTOMIZE_PANEL, async () => {
    const { CustomizePanelAction } = await import('../panel_component/panel_module');
    return new CustomizePanelAction();
  });
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_CUSTOMIZE_PANEL);

  uiActions.registerActionAsync(ACTION_SHOW_CONFIG_PANEL, async () => {
    const { ShowConfigPanelAction } = await import('../panel_component/panel_module');
    return new ShowConfigPanelAction();
  });
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_SHOW_CONFIG_PANEL);
};
