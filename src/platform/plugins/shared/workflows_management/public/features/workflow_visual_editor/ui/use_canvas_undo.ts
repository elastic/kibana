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
 * ⌘Z / Ctrl+Z on the canvas delegates to the undo stack of the main Monaco editor (ADR-0005).
 *
 * While the graph is showing, that editor trails the store by the sync debounce. An undo then would
 * roll back to older text and write it to the store, dropping the last edit, so the key press is
 * swallowed until the editor has caught up; pressing again a moment later works.
 */
export const useCanvasUndo = (
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | null> | undefined,
  yamlStringRef: MutableRefObject<string>
): void => {
  useEffect(() => {
    if (!editorRef) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      // Let Monaco handle it when focus is already inside the editor.
      const { target } = event;
      if (target instanceof HTMLElement && target.closest('.monaco-editor')) {
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
