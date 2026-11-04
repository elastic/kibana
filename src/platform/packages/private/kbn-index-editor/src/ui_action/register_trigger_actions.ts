/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EditIndexFlyoutDeps } from '../types';
import { ACTION_EDIT_INDEX, EDIT_INDEX_CONTENT_TRIGGER_ID } from './constants';

export function registerIndexEditorActions(deps: EditIndexFlyoutDeps) {
  const { uiActions } = deps;

  // Register index editor triggers and actions
  uiActions.addTriggerActionAsync(EDIT_INDEX_CONTENT_TRIGGER_ID, ACTION_EDIT_INDEX, async () => {
    const { createEditIndexContentAction } = await import('./create_edit_index_action');
    return createEditIndexContentAction({
      data: deps.data,
      coreStart: deps.coreStart,
      share: deps.share,
      uiActions: deps.uiActions,
      fieldFormats: deps.fieldFormats,
      fileUpload: deps.fileUpload,
      kql: deps.kql,
    });
  });
}
