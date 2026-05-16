/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import { useCallback } from 'react';
import type { ElementRegistry } from '../lib/dom/element_registry';
import { applyEditChanges } from '../lib/dom/element_registry';
import type { StyleChange, TextNodeChange, SourceChange } from '../lib/dom/element_registry';

/**
 * Tracks style, text, and source attribute edits applied via the edit modal.
 *
 * All edits are stored on the target's `ElementSession`. If no session exists
 * yet (the element hasn't been dragged/duplicated), a lightweight edit-only
 * session is auto-created via `registry.getOrCreate` — the element is NOT
 * cloned or hidden.
 *
 * Revert is handled per-session by `ElementRegistry.resetAll` /
 * `removeSession`, so there is no separate `revertAll` here.
 */
export const useEditChangeTracker = (registryRef: MutableRefObject<ElementRegistry>) => {
  /** Total number of tracked edits across all sessions. */
  const editCount = useCallback(() => {
    let count = 0;
    for (const session of registryRef.current.values()) {
      count += session.styleEdits.length + session.textEdits.length + session.sourceEdits.length;
    }
    return count;
  }, [registryRef]);

  /**
   * Apply modal edits to the DOM and record undo state on the session.
   * Auto-registers a lightweight session if the target isn't managed yet.
   */
  const applyEdits = useCallback(
    (
      target: HTMLElement,
      savedStyleChanges: StyleChange[],
      savedTextChanges: TextNodeChange[],
      savedSourceChanges: SourceChange[]
    ) => {
      const session = registryRef.current.getOrCreate(target);
      applyEditChanges(
        savedStyleChanges,
        savedTextChanges,
        savedSourceChanges,
        session.styleEdits,
        session.textEdits,
        session.sourceEdits
      );
    },
    [registryRef]
  );

  return { editCount, applyEdits };
};
