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
import { AiReviewAction, type ESQLEditorTelemetryService } from '../telemetry/telemetry_service';
import { ReviewActionsWidget } from '../comment_to_esql/review_actions_widget';
import { CODE_ADDED_CLASS, GENERATING_HINT_CLASS, LINE_REPLACED_CLASS } from '../editor_ai.styles';
import { findChangedRegion } from './utils';

type SuggestFixHandler = (
  queryString: string,
  errorMessage: string,
  errorCode?: string | null,
  errorLineNumber?: number
) => void;

// Maps handler → its editor's model ref so the URI can be resolved at call time,
// not at registration time (avoiding timing races with editorModel.current).
const _suggestFixHandlers = new Map<
  SuggestFixHandler,
  MutableRefObject<monaco.editor.ITextModel | undefined>
>();
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
      errorLineNumber?: number,
      modelUri?: string
    ) => {
      let matched: SuggestFixHandler | undefined;
      let fallback: SuggestFixHandler | undefined;
      for (const [handler, modelRef] of _suggestFixHandlers) {
        fallback = handler;
        if (modelUri && modelRef.current?.uri.toString() === modelUri) {
          matched = handler;
          break;
        }
      }
      (matched ?? fallback)?.(queryString, errorMessage, errorCode, errorLineNumber);
    }
  );
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
  telemetryService?: ESQLEditorTelemetryService;
}

export const useSuggestFix = ({
  editorRef,
  editorModel,
  http,
  notifications,
  isEnabled,
  telemetryService,
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

  const trackFixResult = useCallback(
    (
      queryLength: number,
      startTime: number,
      success: boolean,
      errorCode?: string | null,
      changedLineCount?: number
    ) =>
      telemetryService?.trackFixWithAiSubmitted({
        queryLength,
        success,
        durationMs: Date.now() - startTime,
        errorCode: errorCode ?? undefined,
        ...(changedLineCount !== undefined ? { changedLineCount } : {}),
      }),
    [telemetryService]
  );

  const trackFixReview = useCallback(
    (action: AiReviewAction, linesChanged: number) =>
      telemetryService?.trackFixWithAiReviewed({ action, linesChanged }),
    [telemetryService]
  );

  const acceptFix = useCallback(() => {
    const editor = editorRef.current;
    const model = editorModel.current;
    const state = reviewStateRef.current;

    cleanup();

    if (!editor || !model || !state) {
      return;
    }

    trackFixReview(AiReviewAction.ACCEPT, state.generatedLineEnd - state.generatedLineStart + 1);

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
  }, [editorRef, editorModel, cleanup, trackFixReview]);

  const rejectFix = useCallback(() => {
    const editor = editorRef.current;
    const model = editorModel.current;
    const state = reviewStateRef.current;

    cleanup();

    if (!editor || !model || !state) {
      return;
    }

    trackFixReview(AiReviewAction.REJECT, state.generatedLineEnd - state.generatedLineStart + 1);

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
  }, [editorRef, editorModel, cleanup, trackFixReview]);

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

      rejectFix();

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
      const startTime = Date.now();

      try {
        const result = await http.post<{ content: string }>(SUGGEST_FIX_ROUTE, {
          body: JSON.stringify({ queryString, errorMessage, errorCode }),
          signal: controller.signal,
        });

        // Was aborted (retrigger / cleanup) — swallow and let the new run own the UX.
        if (controller.signal.aborted) {
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = undefined;
          }
          return;
        }
        abortControllerRef.current = undefined;

        if (!result?.content) {
          trackFixResult(queryString.length, startTime, false, errorCode);
          return;
        }

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

        trackFixResult(
          queryString.length,
          startTime,
          true,
          errorCode,
          generatedLineEnd - generatedLineStart + 1
        );

        showReview({
          firstChangedOriginalLine,
          lastChangedOriginalLine,
          generatedLineStart,
          generatedLineEnd,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        trackFixResult(queryString.length, startTime, false, errorCode);
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
      rejectFix,
      showReview,
      clearGeneratingDecoration,
      trackFixResult,
    ]
  );

  // Register the Monaco command once.
  useEffect(() => {
    if (!isEnabled) return;

    ensureCommandRegistered();
    _suggestFixHandlers.set(runSuggestFix, editorModel);

    return () => {
      _suggestFixHandlers.delete(runSuggestFix);
    };
  }, [isEnabled, runSuggestFix, editorModel]);
};
