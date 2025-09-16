/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRestorableStateProvider } from '@kbn/restorable-state';
import type { HistoryTabId } from './types';

export interface ESQLEditorRestorableState {
  editorHeight: number;
  resizableContainerHeight: number;
  isHistoryOpen: boolean;
  historySelectedTabId: HistoryTabId;
}

export const { withRestorableState, useRestorableState } =
  createRestorableStateProvider<ESQLEditorRestorableState>();
