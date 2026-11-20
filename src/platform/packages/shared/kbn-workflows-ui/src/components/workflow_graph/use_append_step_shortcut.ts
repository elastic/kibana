/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { InsertionPoints } from './compute_insertion_points';
import { resolveAppendInsertTarget } from './resolve_append_insert_target';
import type { WorkflowGraphEditActions } from './workflow_graph_actions_context';

interface UseAppendStepShortcutParams {
  readonly edit: WorkflowGraphEditActions | undefined;
  readonly suppressInsertionControls: boolean | undefined;
  readonly insertionPoints: InsertionPoints;
  readonly selectedStepId: string | undefined;
}

/**
 * Listens on `window` (not the canvas) so the shortcut works wherever focus sits
 * outside an editable field.
 */
export const useAppendStepShortcut = ({
  edit,
  suppressInsertionControls,
  insertionPoints,
  selectedStepId,
}: UseAppendStepShortcutParams): void => {
  // ⌘K / Ctrl+K appends to the selected sequence (trunk when nothing selected).
  useEffect(() => {
    if (!edit || suppressInsertionControls) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      // Ignore when typing in inputs / Monaco.
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.closest('.monaco-editor'))
      ) {
        return;
      }
      const insertContext = resolveAppendInsertTarget(insertionPoints, selectedStepId);
      if (!insertContext) return;
      event.preventDefault();
      edit.onInsert(insertContext, { left: 0, top: 0, width: 0, height: 0 });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [edit, suppressInsertionControls, insertionPoints, selectedStepId]);
};
