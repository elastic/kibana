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
import { monaco } from '@kbn/code-editor';
import { useCallback, useRef, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import { i18n } from '@kbn/i18n';
import { NL_TO_ESQL_ROUTE } from '@kbn/esql-types';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { ReviewActionsWidget } from './review_actions_widget';

import {
  findTargetComment,
  insertGeneratedCode,
  markCommentInQuery,
  isModelStillValid,
} from './utils';
const CODE_ADDED_CLASS = 'esqlCodeAdded';
const LINE_REPLACED_CLASS = 'esqlLineReplaced';

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
}

export const useCommentToEsql = ({
  editorRef,
  editorModel,
  http,
  notifications,
}: UseCommentToEsqlParams) => {
  const { euiTheme } = useEuiTheme();
  const reviewStateRef = useRef<CommentReviewState | null>(null);
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | undefined>(undefined);
  const widgetRef = useRef<ReviewActionsWidget | undefined>(undefined);
  const contextKeyRef = useRef<monaco.editor.IContextKey<boolean> | undefined>(undefined);
  const actionDisposablesRef = useRef<monaco.IDisposable[]>([]);

  // Diff styles for the comment and the generated code
  const commentToEsqlStyle = useMemo(
    () => css`
      .${CODE_ADDED_CLASS} {
        background-color: ${euiTheme.colors.backgroundLightSuccess};
      }
      .${LINE_REPLACED_CLASS} {
        background-color: ${euiTheme.colors.backgroundLightWarning};
        text-decoration: line-through;
      }
    `,
    [euiTheme.colors.backgroundLightSuccess, euiTheme.colors.backgroundLightWarning]
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
  }, []);

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
      isSurgical: boolean,
      currentQuery: string
    ): Promise<GenerateResult | null> => {
      try {
        const result = await http.post<{ content: string; replacesNext?: boolean }>(
          NL_TO_ESQL_ROUTE,
          {
            body: JSON.stringify({
              nlInstruction,
              currentQuery,
              ...(isSurgical ? { isSurgical: true } : {}),
            }),
          }
        );
        if (!result.content) return null;
        return { content: result.content, replacesNext: result.replacesNext ?? false };
      } catch (error) {
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
    const editor = editorRef.current;
    const model = editorModel.current;
    if (!editor || !model) return;

    if (reviewStateRef.current) {
      cleanup();
    }

    const fullText = model.getValue();
    const position = editor.getPosition();
    if (!position) return;

    const targetComment = findTargetComment(model, position.lineNumber);
    if (!targetComment) return;

    const nlInstruction = targetComment.text.replace(/^\/\/\s*/, '').trim();
    if (!nlInstruction) return;

    const nonCommentContent = fullText
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n')
      .trim();

    const isSurgical = nonCommentContent.length > 0;

    const queryForRoute = isSurgical
      ? markCommentInQuery(fullText, targetComment.lineNumber)
      : fullText;

    const result = await generateESQL(nlInstruction, isSurgical, queryForRoute);
    if (!result) return;

    if (!isModelStillValid(editorModel.current, targetComment.lineNumber)) return;

    if (!isSurgical) {
      const fullRange = model.getFullModelRange();
      editor.executeEdits('nl-to-esql', [{ range: fullRange, text: result.content }]);
      return;
    }

    const { generatedLineStart, generatedLineEnd } = insertGeneratedCode(
      editor,
      model,
      targetComment.lineNumber,
      result.content
    );

    const replacedLineNumber =
      result.replacesNext && generatedLineEnd + 1 <= model.getLineCount()
        ? generatedLineEnd + 1
        : null;

    showReview({
      commentLineNumber: targetComment.lineNumber,
      generatedLineStart,
      generatedLineEnd,
      replacedLineNumber,
    });
  }, [editorRef, editorModel, cleanup, generateESQL, showReview]);

  return {
    commentToEsqlStyle,
    generateFromComment,
    isReviewActiveRef: reviewStateRef,
  };
};
