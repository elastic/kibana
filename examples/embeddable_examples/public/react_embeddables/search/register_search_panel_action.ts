/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { ADD_SEARCH_ACTION_ID } from './constants';

export const registerSearchPanelAction = (uiActions: UiActionsStart) => {
  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ADD_SEARCH_ACTION_ID, async () => {
    const { createSearchPanelAction } = await import('./create_search_panel_action');
    return createSearchPanelAction;
  });
};
