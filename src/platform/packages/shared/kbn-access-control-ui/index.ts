/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { AccessDraftEditor, type AccessDraftEditorProps } from './src/access_draft_editor';
export { AccessSummary, type AccessSummaryProps } from './src/access_summary';
export {
  ObjectAccessPanel,
  toAccessDraft,
  type ObjectAccessPanelProps,
} from './src/object_access_panel';
export { createAccessControlApi, type AccessControlApi } from './src/api';
export type { AccessCopy, LevelCopy } from './src/copy';
export {
  useAccessControlApi,
  useAccessPolicy,
  useObjectAccess,
  type AccessControlError,
  type AsyncResource,
} from './src/hooks';
export type {
  AccessChangeResponse,
  AccessDraft,
  AccessDraftEntry,
  AccessPolicyResponse,
  AccessStateResponse,
  SuggestedUser,
} from './src/types';
