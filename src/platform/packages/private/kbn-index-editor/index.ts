/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  EDIT_LOOKUP_INDEX_CONTENT_TRIGGER,
  EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID,
  ACTION_EDIT_LOOKUP_INDEX,
  registerIndexEditorActions,
} from './src/ui_action';
export type { EditLookupIndexContentContext, EditLookupIndexFlyoutDeps } from './src/types';
