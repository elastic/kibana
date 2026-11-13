/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { monaco } from '@kbn/code-editor';
import { sanitizeText } from '../../../shared/lib/sanitize_text';

/**
 * Where ⌘Z already means "undo here": inside any Monaco editor, or in a form control, whose own
 * undo the browser runs. Anywhere else the key press is a canvas gesture.
 */
const OWN_UNDO_TARGETS =
  '.monaco-editor, input, textarea, select, [contenteditable=""], [contenteditable="true"]';

/**
 * ⌘Z / Ctrl+Z on the canvas delegates to the undo stack of the main Monaco editor (ADR-0005).
 *
 * Who owns undo, in one place:
 *  - Focus in a Monaco editor or a form control: that control's own undo (see `OWN_UNDO_TARGETS`).
 *  - Anywhere else, the canvas: the main editor's undo stack, which is the only history the
 *    workflow has. The visual editor keeps none of its own.
 *  - While the graph is showing, that editor trails the store by the sync debounce
 *    (`useInactiveDebouncedValue`), kept so that typing does not add an undo entry per keystroke.
 *    An undo then would roll back to older text and write it to the store, dropping the last edit,
 *    so the key press is swallowed until the editor has caught up; pressing again a moment later
 *    works.
 *  - An undo changes the YAML under an open step panel; the shell notices
 *    (`resolveExternalStepFragment`) and gives the panel the step as it now is (`syncedFragment`).
 */
export const useCanvasUndo = (
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | null> | undefined,
  yamlStringRef: MutableRefObject<string>
): void => {
  useEffect(() => {
    if (!editorRef) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      // Focus in an editor or a form control: that control's own undo applies, not the workflow's.
      const { target } = event;
      if (target instanceof HTMLElement && target.closest(OWN_UNDO_TARGETS)) {
        return;
      }
      event.preventDefault();
      const editor = editorRef.current;
      const model = editor?.getModel();
      if (model && sanitizeText(model.getValue()) !== sanitizeText(yamlStringRef.current)) {
        return;
      }
      editor?.trigger('graph-gesture', 'undo', null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editorRef, yamlStringRef]);
};
