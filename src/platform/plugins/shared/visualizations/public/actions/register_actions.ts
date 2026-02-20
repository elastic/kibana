/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ACTION_EDIT_IN_LENS } from './constants';
import type { TypesStart } from '../vis_types/types_service';

export function registerActions(
  uiActions: UiActionsStart,
  data: DataPublicPluginStart,
  types: TypesStart
) {
  uiActions.addTriggerActionAsync(CONTEXT_MENU_TRIGGER, ACTION_EDIT_IN_LENS, async () => {
    const { EditInLensAction } = await import('./edit_in_lens_action');
    return new EditInLensAction(data.query.timefilter.timefilter);
  });
}
