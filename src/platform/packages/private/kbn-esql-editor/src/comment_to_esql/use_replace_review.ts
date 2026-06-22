/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/code-editor';
import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { ReviewActionsWidget } from './review_actions_widget';
import { CODE_ADDED_CLASS, LINE_REPLACED_CLASS } from '../editor_ai.styles';

export interface ReviewState {
  firstChangedOriginalLine: number;
  lastChangedOriginalLine: number;
  generatedLineStart: number;
  generatedLineEnd: number;
}

interface UseReplaceReviewParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  euiTheme: EuiThemeComputed;
  contextKeyId: string;
  acceptAction: { id: string; label: string };
  rejectAction: { id: string; label: string };
  editSourceId: string;
  onAfterAccept?: (state: ReviewState) => void;
  onAfterReject?: (state: ReviewState) => void;
}

/**
 * Shared review UI for inline diff-and-replace flows: decorates original changed
 * lines in orange and generated lines in green, then shows a Replace / Undo widget.
 *
 * Returns:
 *  - showReview  — call after inserting the generated lines into the model
 *  - cleanup     — clears decorations/widget/keybindings without reverting editor content
 *  - reject      — reverts the editor to before the suggestion and cleans up
 */
export const useReplaceReview = ({
  editorRef,
  editorModel,
  euiTheme,
  contextKeyId,
  acceptAction,
  rejectAction,
  editSourceId,
  onAfterAccept,
  onAfterReject,
}: UseReplaceReviewParams) => {
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | undefined>(undefined);
  const widgetRef = useRef<ReviewActionsWidget | undefined>(undefined);
  const actionDisposablesRef = useRef<monaco.IDisposable[]>([]);
  const contextKeyRef = useRef<monaco.editor.IContextKey<boolean> | undefined>(undefined);
  const reviewStateRef = useRef<ReviewState | null>(null);

  const cleanup = useCallback(() => {
    decorationsRef.current?.clear();
    decorationsRef.current = undefined;

    widgetRef.current?.dispose();
    widgetRef.current = undefined;

    actionDisposablesRef.current.forEach((d) => d.dispose());
    actionDisposablesRef.current = [];

    contextKeyRef.current?.set(false);
    reviewStateRef.current = null;
  }, []);

  const accept = useCallback(() => {
    const editor = editorRef.current;
    const model = editorModel.current;
    const state = reviewStateRef.current;

    cleanup();

    if (!editor || !model || !state) return;

    editor.executeEdits(`${editSourceId}-accept`, [
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

    onAfterAccept?.(state);
  }, [editorRef, editorModel, cleanup, editSourceId, onAfterAccept]);

  const reject = useCallback(() => {
    const editor = editorRef.current;
    const model = editorModel.current;
    const state = reviewStateRef.current;

    cleanup();

    if (!editor || !model || !state) return;

    editor.executeEdits(`${editSourceId}-reject`, [
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

    onAfterReject?.(state);
  }, [editorRef, editorModel, cleanup, editSourceId, onAfterReject]);

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

      decorationsRef.current = editor.createDecorationsCollection(decorations);

      if (!contextKeyRef.current) {
        contextKeyRef.current = editor.createContextKey(contextKeyId, false);
      }
      contextKeyRef.current.set(true);

      widgetRef.current = new ReviewActionsWidget(
        euiTheme,
        editor,
        state.generatedLineEnd,
        { onAccept: accept, onReject: reject },
        true
      );

      actionDisposablesRef.current = [
        editor.addAction({
          id: rejectAction.id,
          label: rejectAction.label,
          // eslint-disable-next-line no-bitwise
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Backspace],
          precondition: contextKeyId,
          run: () => reject(),
        }),
        editor.addAction({
          id: acceptAction.id,
          label: acceptAction.label,
          // eslint-disable-next-line no-bitwise
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter],
          precondition: contextKeyId,
          run: () => accept(),
        }),
      ];
    },
    [editorRef, euiTheme, contextKeyId, acceptAction, rejectAction, accept, reject]
  );

  return { showReview, cleanup, reject };
};
