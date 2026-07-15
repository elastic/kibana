/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @kbn/eslint/module_migration */
import { StandaloneServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';
import { IUndoRedoService } from 'monaco-editor/esm/vs/platform/undoRedo/common/undoRedo';

import type { Uri } from 'monaco-editor/esm/vs/editor/editor.api';

export interface UndoRedoElement {
  readonly type: 0;
  readonly resource: Uri;
  readonly label: string;
  readonly code: string;
  undo(): void;
  redo(): void;
}

export interface UndoRedoService {
  pushElement(element: UndoRedoElement): void;
}

/**
 * Returns Monaco's internal IUndoRedoService for pushing custom undo/redo elements
 * that interleave with text edits on the same per-resource stack.
 *
 * Returns undefined if the service is not available (e.g., in test environments
 * or before Monaco is fully initialized).
 */
export const getUndoRedoService = (): UndoRedoService | undefined => {
  try {
    return StandaloneServices.get(IUndoRedoService) as UndoRedoService;
  } catch {
    return undefined;
  }
};
