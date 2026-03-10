/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import { useCallback, useRef, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';

const GHOST_HINT_CLASS = 'esqlGhostLineHint';
const CURSOR_PAUSE_MS = 400;

/**
 * Returns true when the cursor is on an empty line and the editor
 * has content (so we don't clash with the empty-editor placeholder).
 */
const shouldShowGhostHint = (model: monaco.editor.ITextModel, lineNumber: number): boolean => {
  const lineContent = model.getLineContent(lineNumber);
  if (lineContent.trim() !== '') {
    return false;
  }

  if (model.getValueLength() === 0) {
    return false;
  }

  return true;
};

interface UseGhostLineHintParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  isReviewActiveRef: MutableRefObject<object | null>;
}

export const useGhostLineHint = ({
  editorRef,
  editorModel,
  isReviewActiveRef,
}: UseGhostLineHintParams) => {
  const { euiTheme } = useEuiTheme();
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | undefined>(undefined);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const commandKey = isMac ? '⌘' : 'Ctrl';
  const ghostHintText = i18n.translate('esqlEditor.ghostLineHint', {
    defaultMessage: 'Type // and press {commandKey}+J to ask AI to add a step',
    values: { commandKey },
  });

  const ghostLineHintStyle = useMemo(
    () => css`
      .${GHOST_HINT_CLASS}::after {
        content: '${ghostHintText}';
        opacity: 0.4;
        font-style: italic;
        pointer-events: none;
        color: ${euiTheme.colors.textSubdued};
      }
    `,
    [euiTheme.colors.textSubdued, ghostHintText]
  );

  const clearDecoration = useCallback(() => {
    decorationsRef.current?.clear();
  }, []);

  const showDecoration = useCallback(
    (lineNumber: number) => {
      const editor = editorRef.current;
      if (!editor) return;

      decorationsRef.current?.clear();

      decorationsRef.current = editor.createDecorationsCollection([
        {
          range: new monaco.Range(lineNumber, 1, lineNumber, 1),
          options: {
            isWholeLine: true,
            className: GHOST_HINT_CLASS,
          },
        },
      ]);
    },
    [editorRef]
  );

  const clearTimer = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
    }
  }, []);

  const setupGhostLineHint = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor): monaco.IDisposable[] => {
      const disposables: monaco.IDisposable[] = [];

      disposables.push(
        editor.onDidChangeCursorPosition(() => {
          clearDecoration();
          clearTimer();

          debounceTimerRef.current = setTimeout(() => {
            if (isReviewActiveRef.current) return;

            const model = editorModel.current;
            const position = editor.getPosition();
            if (!model || !position) return;

            if (shouldShowGhostHint(model, position.lineNumber)) {
              showDecoration(position.lineNumber);
            }
          }, CURSOR_PAUSE_MS);
        })
      );

      disposables.push(
        editor.onDidChangeModelContent(() => {
          clearTimer();
          clearDecoration();
        })
      );

      disposables.push({
        dispose: () => {
          clearTimer();
          clearDecoration();
        },
      });

      return disposables;
    },
    [editorModel, clearDecoration, clearTimer, showDecoration, isReviewActiveRef]
  );

  return {
    ghostLineHintStyle,
    setupGhostLineHint,
  };
};
