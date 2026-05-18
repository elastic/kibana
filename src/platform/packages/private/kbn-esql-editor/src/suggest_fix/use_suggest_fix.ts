/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { monaco } from '@kbn/code-editor';
import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { i18n } from '@kbn/i18n';
import { SUGGEST_FIX_ROUTE, FIX_WITH_AI_COMMAND_ID } from '@kbn/esql-types';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { ReviewActionsWidget } from '../comment_to_esql/review_actions_widget';
import {
  CODE_ADDED_CLASS,
  GENERATING_HINT_CLASS,
  LINE_REPLACED_CLASS,
} from '../editor_ai_constants';

// The command is registered once for the lifetime of
// the app; the handler reads _runSuggestFixFn so we never need to re-register.
const _runSuggestFixFn: {
  current:
    | ((
        queryString: string,
        errorMessage: string,
        errorCode?: string | null,
        errorLineNumber?: number
      ) => void)
    | undefined;
} = { current: undefined };
let _commandRegistered = false;

function ensureCommandRegistered() {
  if (_commandRegistered) return;
  _commandRegistered = true;
  monaco.editor.registerCommand(
    FIX_WITH_AI_COMMAND_ID,
    (
      _accessor: unknown,
      queryString: string,
      errorMessage: string,
      errorCode?: string | null,
      errorLineNumber?: number
    ) => {
      _runSuggestFixFn.current?.(queryString, errorMessage, errorCode, errorLineNumber);
    }
  );
}

/**
 * Returns the number of identical lines at the start and end of both arrays.
 * Lines are compared after trimming so that indentation differences introduced
 * by the LLM (e.g. dropping leading spaces from pipe-separated lines) don't
 * cause unchanged lines to appear in the diff.
 */
function findChangedRegion(
  originalLines: string[],
  fixedLines: string[]
): { prefixLen: number; suffixLen: number } {
  const maxPrefix = Math.min(originalLines.length, fixedLines.length);
  let prefixLen = 0;
  while (
    prefixLen < maxPrefix &&
    originalLines[prefixLen].trim() === fixedLines[prefixLen].trim()
  ) {
    prefixLen++;
  }

  const maxSuffix = Math.min(originalLines.length - prefixLen, fixedLines.length - prefixLen);
  let suffixLen = 0;
  while (
    suffixLen < maxSuffix &&
    originalLines[originalLines.length - 1 - suffixLen].trim() ===
      fixedLines[fixedLines.length - 1 - suffixLen].trim()
  ) {
    suffixLen++;
  }

  return { prefixLen, suffixLen };
}

interface ReviewState {
  firstChangedOriginalLine: number;
  lastChangedOriginalLine: number;
  generatedLineStart: number;
  generatedLineEnd: number;
}

interface UseSuggestFixParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  http: HttpStart;
  notifications: NotificationsStart;
  isEnabled: boolean;
}

export const useSuggestFix = ({
  editorRef,
  editorModel,
  http,
  notifications,
  isEnabled,
}: UseSuggestFixParams) => {
  const { euiTheme } = useEuiTheme();

  const reviewDecorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | undefined>(
    undefined
  );
  const generatingDecorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | undefined>(
    undefined
  );
  const widgetRef = useRef<ReviewActionsWidget | undefined>(undefined);
  const contextKeyRef = useRef<monaco.editor.IContextKey<boolean> | undefined>(undefined);
  const actionDisposablesRef = useRef<monaco.IDisposable[]>([]);
  const reviewStateRef = useRef<ReviewState | null>(null);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  const abortInFlight = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = undefined;
  }, []);

  const clearGeneratingDecoration = useCallback(() => {
    generatingDecorationsRef.current?.clear();
    generatingDecorationsRef.current = undefined;
  }, []);

  const cleanup = useCallback(() => {
    reviewDecorationsRef.current?.clear();
    reviewDecorationsRef.current = undefined;

    if (widgetRef.current) {
      widgetRef.current.dispose();
      widgetRef.current = undefined;
    }

    actionDisposablesRef.current.forEach((d) => d.dispose());
    actionDisposablesRef.current = [];
    contextKeyRef.current?.set(false);
    reviewStateRef.current = null;

    clearGeneratingDecoration();
    abortInFlight();
  }, [clearGeneratingDecoration, abortInFlight]);

  const acceptFix = useCallback(() => {
    const editor = editorRef.current;
    const model = editorModel.current;
    const state = reviewStateRef.current;
    if (!editor || !model || !state) {
      cleanup();
      return;
    }

    cleanup();

    // Remove only the original changed lines — the fix lines shift up to replace them
    editor.executeEdits('esql-suggest-fix-accept', [
      {
        range: new monaco.Range(
          state.firstChangedOriginalLine,
          1,
          state.lastChangedOriginalLine + 1,
          1
        ),
        text: null,
      },
    ]);
  }, [editorRef, editorModel, cleanup]);

  const rejectFix = useCallback(() => {
    const editor = editorRef.current;
    const model = editorModel.current;
    const state = reviewStateRef.current;
    if (!editor || !model || !state) {
      cleanup();
      return;
    }

    cleanup();

    // Remove the "\n" connector + fix lines by selecting from the end of the last
    // original changed line through the end of the last fix line.
    editor.executeEdits('esql-suggest-fix-reject', [
      {
        range: new monaco.Range(
          state.lastChangedOriginalLine,
          model.getLineMaxColumn(state.lastChangedOriginalLine),
          state.generatedLineEnd,
          model.getLineMaxColumn(state.generatedLineEnd)
        ),
        text: null,
      },
    ]);
  }, [editorRef, editorModel, cleanup]);

  const showReview = useCallback(
    (state: ReviewState) => {
      const editor = editorRef.current;
      if (!editor) return;

      reviewStateRef.current = state;

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      for (
        let line = state.firstChangedOriginalLine;
        line <= state.lastChangedOriginalLine;
        line++
      ) {
        decorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: { isWholeLine: true, className: LINE_REPLACED_CLASS },
        });
      }

      for (let line = state.generatedLineStart; line <= state.generatedLineEnd; line++) {
        decorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: { isWholeLine: true, className: CODE_ADDED_CLASS },
        });
      }

      reviewDecorationsRef.current = editor.createDecorationsCollection(decorations);

      if (!contextKeyRef.current) {
        contextKeyRef.current = editor.createContextKey('esqlFixReviewActive', false);
      }
      contextKeyRef.current.set(true);

      widgetRef.current = new ReviewActionsWidget(
        euiTheme,
        editor,
        state.generatedLineEnd,
        { onAccept: acceptFix, onReject: rejectFix },
        true
      );

      actionDisposablesRef.current = [
        editor.addAction({
          id: 'esql.suggestFix.reject',
          label: i18n.translate('esqlEditor.suggestFix.rejectLabel', {
            defaultMessage: 'Undo AI fix',
          }),
          // eslint-disable-next-line no-bitwise
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Backspace],
          precondition: 'esqlFixReviewActive',
          run: () => rejectFix(),
        }),
        editor.addAction({
          id: 'esql.suggestFix.accept',
          label: i18n.translate('esqlEditor.suggestFix.acceptLabel', {
            defaultMessage: 'Keep AI fix',
          }),
          // eslint-disable-next-line no-bitwise
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter],
          precondition: 'esqlFixReviewActive',
          run: () => acceptFix(),
        }),
      ];
    },
    [editorRef, euiTheme, acceptFix, rejectFix]
  );

  const runSuggestFix = useCallback(
    async (
      queryString: string,
      errorMessage: string,
      errorCode?: string | null,
      errorLineNumber?: number
    ) => {
      if (!isEnabled) return;

      const editor = editorRef.current;
      const model = editorModel.current;
      if (!editor || !model) return;

      abortInFlight();
      cleanup();

      const decorationLine = errorLineNumber ?? model.getLineCount();
      const decorationCol = model.getLineMaxColumn(decorationLine);
      generatingDecorationsRef.current = editor.createDecorationsCollection([
        {
          range: new monaco.Range(decorationLine, decorationCol, decorationLine, decorationCol),
          options: { afterContentClassName: GENERATING_HINT_CLASS },
        },
      ]);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const result = await http.post<{ content: string }>(SUGGEST_FIX_ROUTE, {
          body: JSON.stringify({ queryString, errorMessage, errorCode }),
          signal: controller.signal,
        });

        if (controller.signal.aborted || !result?.content) {
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = undefined;
          }
          return;
        }
        abortControllerRef.current = undefined;

        const fixedQuery = result.content.replace(/\n+$/, '');
        const originalLines = model.getValue().split('\n');
        const fixedLines = fixedQuery.split('\n');

        const { prefixLen, suffixLen } = findChangedRegion(originalLines, fixedLines);

        const firstChangedOriginalLine = prefixLen + 1;
        const lastChangedOriginalLine = originalLines.length - suffixLen;
        const changedFixedLines = fixedLines.slice(prefixLen, fixedLines.length - suffixLen);

        // Nothing actually changed
        if (changedFixedLines.length === 0 && firstChangedOriginalLine > lastChangedOriginalLine) {
          return;
        }

        // Insert only the changed fix lines after the last changed original line
        const insertMaxCol = model.getLineMaxColumn(lastChangedOriginalLine);
        editor.executeEdits('esql-suggest-fix', [
          {
            range: new monaco.Range(
              lastChangedOriginalLine,
              insertMaxCol,
              lastChangedOriginalLine,
              insertMaxCol
            ),
            text: '\n' + changedFixedLines.join('\n'),
            forceMoveMarkers: true,
          },
        ]);

        const generatedLineStart = lastChangedOriginalLine + 1;
        const generatedLineEnd = lastChangedOriginalLine + changedFixedLines.length;

        showReview({
          firstChangedOriginalLine,
          lastChangedOriginalLine,
          generatedLineStart,
          generatedLineEnd,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          (error as { body?: { message?: string } })?.body?.message ??
          i18n.translate('esqlEditor.suggestFix.error', {
            defaultMessage: 'Failed to generate an AI fix for the query',
          });
        notifications.toasts.addDanger({ title: message });
      } finally {
        clearGeneratingDecoration();
      }
    },
    [
      isEnabled,
      editorRef,
      editorModel,
      http,
      notifications.toasts,
      abortInFlight,
      cleanup,
      showReview,
      clearGeneratingDecoration,
    ]
  );

  // Register the Monaco command once (module-level) and keep the handler ref
  // up-to-date so clicks always invoke the latest runSuggestFix closure.
  useEffect(() => {
    if (!isEnabled) {
      _runSuggestFixFn.current = undefined;
      return;
    }

    ensureCommandRegistered();
    _runSuggestFixFn.current = runSuggestFix;

    return () => {
      _runSuggestFixFn.current = undefined;
    };
  }, [isEnabled, runSuggestFix]);
};
