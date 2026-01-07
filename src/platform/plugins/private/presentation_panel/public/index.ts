/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PresentationPanelPlugin } from './plugin';

export function plugin() {
  return new PresentationPanelPlugin();
}

export { PresentationPanelQuickActionContext } from './panel_component/panel_header/presentation_panel_quick_action_context';
export { DEFAULT_QUICK_ACTION_IDS } from './panel_component/constants';
export { ACTION_CUSTOMIZE_PANEL } from './panel_actions/customize_panel_action/constants';
export { ACTION_EDIT_PANEL } from './panel_actions/edit_panel_action/constants';
export { ACTION_REMOVE_PANEL } from './panel_actions/remove_panel_action/constants';
export { PresentationPanel } from './panel_component';
export type { PresentationPanelProps } from './panel_component/types';
export { PresentationPanelError } from './panel_component/presentation_panel_error';
