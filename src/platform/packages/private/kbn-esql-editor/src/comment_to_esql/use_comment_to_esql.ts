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
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { NL_TO_ESQL_ROUTE } from '@kbn/esql-types';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { ReviewActionsWidget } from './review_actions_widget';

const COMMENT_REMOVED_CLASS = 'esqlCommentRemoved';
const CODE_ADDED_CLASS = 'esqlCodeAdded';

interface CommentReviewState {
  // The line number of the comment which generated the code
  commentLineNumber: number;
  // The line number of the first line of the generated code that was inserted
  generatedLineStart: number;
  // The line number of the last line of the generated code that was inserted
  generatedLineEnd: number;
  // The line number of the line that was replaced by the generated code, if any
  replacedLineNumber: number | null;
}

interface UseCommentToEsqlParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  http: HttpStart;
  notifications: NotificationsStart;
}

const findTargetComment = (
  model: monaco.editor.ITextModel,
  cursorLineNumber: number
): { lineNumber: number; text: string } | null => {
  const lineContent = model.getLineContent(cursorLineNumber).trim();
  if (lineContent.startsWith('//')) {
    return { lineNumber: cursorLineNumber, text: lineContent };
  }
  return null;
};

const insertGeneratedCode = (
  editor: monaco.editor.IStandaloneCodeEditor,
  model: monaco.editor.ITextModel,
  afterLineNumber: number,
  generatedText: string
): { generatedLineStart: number; generatedLineEnd: number } => {
  const code = generatedText.endsWith('\n') ? generatedText : generatedText + '\n';
  const isLastLine = afterLineNumber >= model.getLineCount();

  if (isLastLine) {
    const lineContent = model.getLineContent(afterLineNumber);
    editor.executeEdits('nl-to-esql-preview', [
      {
        range: new monaco.Range(
          afterLineNumber,
          lineContent.length + 1,
          afterLineNumber,
          lineContent.length + 1
        ),
        text: '\n' + code,
        forceMoveMarkers: true,
      },
    ]);
  } else {
    editor.executeEdits('nl-to-esql-preview', [
      {
        range: new monaco.Range(afterLineNumber + 1, 1, afterLineNumber + 1, 1),
        text: code,
        forceMoveMarkers: true,
      },
    ]);
  }

  const lineCount = code.split('\n').length - 1;
  return {
    generatedLineStart: afterLineNumber + 1,
    generatedLineEnd: afterLineNumber + lineCount,
  };
};

const markCommentInQuery = (fullText: string, commentLineNumber: number): string => {
  return fullText
    .split('\n')
    .map((line, idx) => (idx === commentLineNumber - 1 ? `>>> ${line} <<<` : line))
    .join('\n');
};

const getPipeCommand = (line: string): string | null => {
  const match = line.trim().match(/^\|\s*(\w+)/i);
  return match ? match[1].toUpperCase() : null;
};

const detectReplacedLine = (
  model: monaco.editor.ITextModel,
  generatedLineStart: number,
  generatedLineEnd: number
): number | null => {
  const lineAfterGenerated = generatedLineEnd + 1;
  if (lineAfterGenerated > model.getLineCount()) return null;

  const generatedPipe = getPipeCommand(model.getLineContent(generatedLineStart));
  const nextPipe = getPipeCommand(model.getLineContent(lineAfterGenerated));

  if (generatedPipe && nextPipe && generatedPipe === nextPipe) {
    return lineAfterGenerated;
  }
  return null;
};

const isModelStillValid = (
  model: monaco.editor.ITextModel | undefined,
  commentLineNumber: number
): model is monaco.editor.ITextModel => {
  if (!model || model.isDisposed()) return false;
  if (commentLineNumber > model.getLineCount()) return false;
  return model.getLineContent(commentLineNumber).trim().startsWith('//');
};

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
      .${COMMENT_REMOVED_CLASS} {
        background-color: ${euiTheme.colors.backgroundLightDanger};
        text-decoration: line-through;
      }
      .${CODE_ADDED_CLASS} {
        background-color: ${euiTheme.colors.backgroundLightSuccess};
      }
    `,
    [euiTheme.colors.backgroundLightDanger, euiTheme.colors.backgroundLightSuccess]
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
    if (!editor || !model || !state) return;

    cleanup();

    const edits: monaco.editor.IIdentifiedSingleEditOperation[] = [];

    if (state.replacedLineNumber) {
      const replacedContent = model.getLineContent(state.replacedLineNumber);
      const isReplacedLast = state.replacedLineNumber === model.getLineCount();
      edits.push({
        range: new monaco.Range(
          state.replacedLineNumber,
          1,
          isReplacedLast ? state.replacedLineNumber : state.replacedLineNumber + 1,
          isReplacedLast ? replacedContent.length + 1 : 1
        ),
        text: null,
      });
    }

    const commentLineContent = model.getLineContent(state.commentLineNumber);
    const isLastLine = state.commentLineNumber === model.getLineCount();
    edits.push({
      range: new monaco.Range(
        state.commentLineNumber,
        1,
        isLastLine ? state.commentLineNumber : state.commentLineNumber + 1,
        isLastLine ? commentLineContent.length + 1 : 1
      ),
      text: null,
    });

    editor.executeEdits('nl-to-esql-accept', edits);
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

      const decorations: monaco.editor.IModelDeltaDecoration[] = [
        {
          range: new monaco.Range(state.commentLineNumber, 1, state.commentLineNumber, 1),
          options: {
            isWholeLine: true,
            className: COMMENT_REMOVED_CLASS,
          },
        },
      ];

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
            className: COMMENT_REMOVED_CLASS,
          },
        });
      }

      decorationsRef.current = editor.createDecorationsCollection(decorations);

      widgetRef.current = new ReviewActionsWidget(euiTheme, editor, state.generatedLineEnd, {
        onAccept: acceptChange,
        onReject: rejectChange,
      });

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

  const callRoute = useCallback(
    async (
      nlInstruction: string,
      sources: string[] | undefined,
      isSurgical: boolean,
      currentQuery: string
    ): Promise<string | null> => {
      try {
        const result = await http.post<{ content: string }>(NL_TO_ESQL_ROUTE, {
          body: JSON.stringify({
            query: nlInstruction,
            sources,
            ...(isSurgical ? { currentQuery } : {}),
          }),
        });
        return result.content || null;
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
    const sourcePattern = getIndexPatternFromESQLQuery(fullText);
    const sources = sourcePattern ? sourcePattern.split(',').map((s) => s.trim()) : undefined;

    const queryForRoute = isSurgical
      ? markCommentInQuery(fullText, targetComment.lineNumber)
      : fullText;

    const generatedText = await callRoute(nlInstruction, sources, isSurgical, queryForRoute);
    if (!generatedText) return;

    if (!isModelStillValid(editorModel.current, targetComment.lineNumber)) return;

    if (!isSurgical) {
      const fullRange = model.getFullModelRange();
      editor.executeEdits('nl-to-esql', [{ range: fullRange, text: generatedText }]);
      return;
    }

    const { generatedLineStart, generatedLineEnd } = insertGeneratedCode(
      editor,
      model,
      targetComment.lineNumber,
      generatedText
    );

    const replacedLineNumber = detectReplacedLine(model, generatedLineStart, generatedLineEnd);

    showReview({
      commentLineNumber: targetComment.lineNumber,
      generatedLineStart,
      generatedLineEnd,
      replacedLineNumber,
    });
  }, [editorRef, editorModel, cleanup, callRoute, showReview]);

  return {
    commentToEsqlStyle,
    generateFromComment,
    isReviewActiveRef: reviewStateRef,
  };
};
