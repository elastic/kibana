/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INDEX_EDITOR_CELL_ACTION_TRIGGER_ID } from './cell_actions';
import {
  ACTION_EDIT_LOOKUP_INDEX,
  EDIT_LOOKUP_INDEX_CONTENT_TRIGGER,
  EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID,
  type EditLookupIndexFlyoutDeps,
} from '../..';
import { ACTION_EDIT_CELL_VALUE_INDEX } from './edit_cell_value';
import { IndexUpdateService } from '../index_update_service';

// TODO organise imports

export function registerIndexEditorActions(deps: EditLookupIndexFlyoutDeps) {
  const { uiActions } = deps;

  // TODO should be an async import
  const indexUpdateService = new IndexUpdateService(deps.coreStart.http);

  // Register index editor triggers and actions
  uiActions.registerTrigger(EDIT_LOOKUP_INDEX_CONTENT_TRIGGER);
  uiActions.addTriggerActionAsync(
    EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID,
    ACTION_EDIT_LOOKUP_INDEX,
    async () => {
      const { createEditLookupIndexContentAction } = await import('../..');
      return createEditLookupIndexContentAction({
        data: deps.data,
        coreStart: deps.coreStart,
        share: deps.share,
        uiActions: deps.uiActions,
        fieldFormats: deps.fieldFormats,
        indexUpdateService,
      });
    }
  );

  // Register additional cell actions
  uiActions.registerTrigger({ id: INDEX_EDITOR_CELL_ACTION_TRIGGER_ID });
  uiActions.addTriggerActionAsync(
    INDEX_EDITOR_CELL_ACTION_TRIGGER_ID,
    ACTION_EDIT_CELL_VALUE_INDEX,
    async () => {
      const { createEditCellValueActionFactory } = await import('../..');
      const actionFactory = createEditCellValueActionFactory({
        notifications: deps.coreStart.notifications,
        indexUpdateService,
      });

      return actionFactory({
        notifications: deps.coreStart.notifications,
      });
    }
  );
}
