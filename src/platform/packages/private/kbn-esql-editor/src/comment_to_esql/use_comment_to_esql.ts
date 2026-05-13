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
import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { i18n } from '@kbn/i18n';
import { NL_TO_ESQL_ROUTE } from '@kbn/esql-types';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { ReviewActionsWidget } from './review_actions_widget';
import {
  CODE_ADDED_CLASS,
  GENERATING_HINT_CLASS,
  LINE_REPLACED_CLASS,
  useCommentToEsqlStyle,
} from './comment_to_esql.styles';

import {
  findTargetComment,
  insertGeneratedCode,
  markCommentInQuery,
  isModelStillValid,
} from './utils';

interface GenerateResult {
  content: string;
  replacesNext: boolean;
}

interface CommentReviewState {
  commentLineNumber: number;
  generatedLineStart: number;
  generatedLineEnd: number;
  replacedLineNumber: number | null;
}

interface UseCommentToEsqlParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  http: HttpStart;
  notifications: NotificationsStart;
  isEnabled: boolean;
  // Hides any already-visible ghost-line hint so it doesn't overlap with the
  // "Generating..." decoration during the LLM call. Populated by useGhostLineHint.
  clearGhostHintRef?: MutableRefObject<() => void>;
}

export const useCommentToEsql = ({
  editorRef,
  editorModel,
  http,
  notifications,
  isEnabled,
  clearGhostHintRef,
}: UseCommentToEsqlParams) => {
  const { euiTheme } = useEuiTheme();
  const commentToEsqlStyle = useCommentToEsqlStyle();
  const reviewStateRef = useRef<CommentReviewState | null>(null);
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | undefined>(undefined);
  const widgetRef = useRef<ReviewActionsWidget | undefined>(undefined);
  const contextKeyRef = useRef<monaco.editor.IContextKey<boolean> | undefined>(undefined);
  const actionDisposablesRef = useRef<monaco.IDisposable[]>([]);
  // Aborts the in-flight nl_to_esql HTTP request when the user retriggers or accepts/rejects.
  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  // Sticky decoration that tracks the comment line as the user types during the LLM wait.
  const commentAnchorRef = useRef<monaco.editor.IEditorDecorationsCollection | undefined>(
    undefined
  );
  // Inline "Generating..." hint shown next to the comment while we await the LLM response.
  const generatingDecorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | undefined>(
    undefined
  );
  // Read by useGhostLineHint to suppress its hint while a generation is in flight.
  const isGeneratingRef = useRef(false);

  const clearCommentAnchor = useCallback(() => {
    commentAnchorRef.current?.clear();
    commentAnchorRef.current = undefined;
  }, []);

  const abortInFlight = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = undefined;
  }, []);

  const clearGeneratingDecoration = useCallback(() => {
    generatingDecorationsRef.current?.clear();
    generatingDecorationsRef.current = undefined;
    isGeneratingRef.current = false;
  }, []);

  const showGeneratingDecoration = useCallback(
    (lineNumber: number) => {
      const editor = editorRef.current;
      const model = editorModel.current;
      if (!editor || !model) return;

      generatingDecorationsRef.current?.clear();

      const column = model.getLineMaxColumn(lineNumber);
      generatingDecorationsRef.current = editor.createDecorationsCollection([
        {
          range: new monaco.Range(lineNumber, column, lineNumber, column),
          options: {
            afterContentClassName: GENERATING_HINT_CLASS,
          },
        },
      ]);
    },
    [editorRef, editorModel]
  );

  const cleanup = useCallback(() => {
    decorationsRef.current?.clear();
    decorationsRef.current = undefined;

    if (widgetRef.current) {
      widgetRef.current.dispose();
      widgetRef.current = undefined;
    }

    actionDisposablesRef.current.forEach((d) => d.dispose());
    actionDisposablesRef.current = [];
    contextKeyRef.current?.set(false);
    reviewStateRef.current = null;

    clearCommentAnchor();
    clearGeneratingDecoration();
    abortInFlight();
  }, [clearCommentAnchor, clearGeneratingDecoration, abortInFlight]);

  const acceptChange = useCallback(() => {
    const editor = editorRef.current;
    const model = editorModel.current;
    const state = reviewStateRef.current;
    if (!editor || !model || !state) {
      cleanup();
      return;
    }

    const { replacedLineNumber } = state;
    cleanup();

    if (replacedLineNumber) {
      const lineContent = model.getLineContent(replacedLineNumber);
      const isLastLine = replacedLineNumber === model.getLineCount();
      editor.executeEdits('nl-to-esql-accept', [
        {
          range: new monaco.Range(
            replacedLineNumber,
            1,
            isLastLine ? replacedLineNumber : replacedLineNumber + 1,
            isLastLine ? lineContent.length + 1 : 1
          ),
          text: null,
        },
      ]);
    }
  }, [editorRef, editorModel, cleanup]);

  const rejectChange = useCallback(() => {
    const editor = editorRef.current;
    const model = editorModel.current;
    const state = reviewStateRef.current;
    if (!editor || !model || !state) return;

    cleanup();

    editor.executeEdits('nl-to-esql-reject', [
      {
        range: new monaco.Range(state.generatedLineStart, 1, state.generatedLineEnd + 1, 1),
        text: null,
      },
    ]);
  }, [editorRef, editorModel, cleanup]);

  const showReview = useCallback(
    (state: CommentReviewState) => {
      const editor = editorRef.current;
      if (!editor) return;

      reviewStateRef.current = state;

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      for (let line = state.generatedLineStart; line <= state.generatedLineEnd; line++) {
        decorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: CODE_ADDED_CLASS,
          },
        });
      }

      if (state.replacedLineNumber) {
        decorations.push({
          range: new monaco.Range(state.replacedLineNumber, 1, state.replacedLineNumber, 1),
          options: {
            isWholeLine: true,
            className: LINE_REPLACED_CLASS,
          },
        });
      }

      decorationsRef.current = editor.createDecorationsCollection(decorations);

      const widgetAfterLine = state.replacedLineNumber ?? state.generatedLineEnd;
      widgetRef.current = new ReviewActionsWidget(
        euiTheme,
        editor,
        widgetAfterLine,
        { onAccept: acceptChange, onReject: rejectChange },
        Boolean(state.replacedLineNumber)
      );

      if (!contextKeyRef.current) {
        contextKeyRef.current = editor.createContextKey('esqlCommentReviewActive', false);
      }
      contextKeyRef.current.set(true);

      actionDisposablesRef.current = [
        editor.addAction({
          id: 'esql.commentReview.reject',
          label: 'Reject generated code',
          // eslint-disable-next-line no-bitwise
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Backspace],
          precondition: 'esqlCommentReviewActive',
          run: () => rejectChange(),
        }),
        editor.addAction({
          id: 'esql.commentReview.accept',
          label: 'Accept generated code',
          // eslint-disable-next-line no-bitwise
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter],
          precondition: 'esqlCommentReviewActive',
          run: () => acceptChange(),
        }),
      ];
    },
    [editorRef, euiTheme, acceptChange, rejectChange]
  );

  const generateESQL = useCallback(
    async (
      nlInstruction: string,
      isCompletion: boolean,
      currentQuery: string,
      signal: AbortSignal
    ): Promise<GenerateResult | null> => {
      try {
        const result = await http.post<{ content: string; replacesNext?: boolean }>(
          NL_TO_ESQL_ROUTE,
          {
            body: JSON.stringify({
              nlInstruction,
              currentQuery,
              ...(isCompletion ? { isCompletion: true } : {}),
            }),
            signal,
          }
        );
        if (!result.content) return null;
        return { content: result.content, replacesNext: result.replacesNext ?? false };
      } catch (error) {
        // The user retriggered or cancelled — swallow and let the new run own the UX.
        if (signal.aborted) return null;
        const message =
          (error as { body?: { message?: string } })?.body?.message ??
          i18n.translate('esqlEditor.commentToEsql.error', {
            defaultMessage: 'Failed to generate ES|QL from comment',
          });
        notifications.toasts.addDanger({ title: message });
        return null;
      }
    },
    [http, notifications.toasts]
  );

  const generateFromComment = useCallback(async () => {
    if (!isEnabled) return;
    const editor = editorRef.current;
    const model = editorModel.current;
    if (!editor || !model) return;

    // Retrigger: abort any in-flight request and tear down a pending review.
    if (reviewStateRef.current || abortControllerRef.current) {
      cleanup();
    }

    const fullText = model.getValue();
    const position = editor.getPosition();
    if (!position) return;

    const targetComment = findTargetComment(model, position.lineNumber);
    if (!targetComment) return;

    // Remove the leading // and trim the comment text
    const nlInstruction = targetComment.text.replace(/^\/\/\s*/, '').trim();
    if (!nlInstruction) return;

    const nonCommentContent = fullText
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n')
      .trim();

    const isCompletion = nonCommentContent.length > 0;

    const queryForRoute = isCompletion
      ? markCommentInQuery(fullText, targetComment.lineNumber)
      : fullText;

    // Sticky anchor that follows the comment line if the user types above it during the wait.
    commentAnchorRef.current = editor.createDecorationsCollection([
      {
        range: new monaco.Range(targetComment.lineNumber, 1, targetComment.lineNumber, 1),
        options: {
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      },
    ]);

    isGeneratingRef.current = true;
    clearGhostHintRef?.current();
    showGeneratingDecoration(targetComment.lineNumber);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Ensures the generating flag and decoration are reset on every exit path,
    // even if a downstream step throws (e.g. executeEdits on a disposed model).
    try {
      const result = await generateESQL(
        nlInstruction,
        isCompletion,
        queryForRoute,
        controller.signal
      );

      // Was aborted (retrigger / cleanup) or had no content.
      if (controller.signal.aborted || !result) {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = undefined;
        }
        return;
      }
      abortControllerRef.current = undefined;

      const liveModel = editorModel.current;
      const anchorRanges = commentAnchorRef.current?.getRanges() ?? [];
      clearCommentAnchor();

      const currentCommentLine = anchorRanges[0]?.startLineNumber;
      if (!currentCommentLine || !isModelStillValid(liveModel, currentCommentLine)) return;

      const { generatedLineStart, generatedLineEnd } = insertGeneratedCode(
        editor,
        liveModel,
        currentCommentLine,
        result.content
      );

      const replacedLineNumber =
        result.replacesNext && generatedLineEnd + 1 <= liveModel.getLineCount()
          ? generatedLineEnd + 1
          : null;

      showReview({
        commentLineNumber: currentCommentLine,
        generatedLineStart,
        generatedLineEnd,
        replacedLineNumber,
      });
    } finally {
      clearGeneratingDecoration();
    }
  }, [
    editorRef,
    editorModel,
    cleanup,
    clearCommentAnchor,
    showGeneratingDecoration,
    clearGeneratingDecoration,
    clearGhostHintRef,
    generateESQL,
    showReview,
    isEnabled,
  ]);

  return {
    commentToEsqlStyle,
    generateFromComment,
    isReviewActiveRef: reviewStateRef,
    isGeneratingRef,
  };
};
