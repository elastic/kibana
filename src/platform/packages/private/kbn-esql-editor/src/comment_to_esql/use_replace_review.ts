/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/code-editor';
import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { ReviewActionsWidget } from './review_actions_widget';
import type { PreviewPendingRef } from './preview_pending';
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
  rejectAction: { id: string; label: string };
  editSourceId: string;
  /** Whether accepting replaces original lines ("Replace") or only keeps the new ones ("Keep"). */
  isReplaceMode?: (state: ReviewState) => boolean;
  /** Cleared when the review ends so the following accept/reject edit can publish. */
  previewPendingRef?: PreviewPendingRef;
  onAfterAccept?: (state: ReviewState, acceptedQuery: string) => void;
  onAfterReject?: (state: ReviewState) => void;
}

const alwaysReplace = () => true;

/**
 * Shared review UI for inline diff-and-replace flows: decorates original changed
 * lines in orange and generated lines in green, then shows a Replace / Undo widget.
 * Accepting is left to the editor's run action (Cmd/Ctrl+Enter), which is why only
 * the undo keybinding is registered here.
 *
 * The generated lines are followed through edits with a tracked decoration, so removing
 * them stays correct even if the user typed above them.
 *
 * Returns:
 *  - showReview  — call after inserting the generated lines into the model
 *  - cleanup     — clears decorations/widget/keybindings without reverting editor content
 *  - dismiss     — removes the generated lines and cleans up, without calling any callback
 *  - reject      — dismiss, then calls onAfterReject
 *  - accept      — keeps the suggestion and drops the original lines; false if nothing was
 *                  pending, or if the user edited the query since (the suggestion is dismissed)
 */
export const useReplaceReview = ({
  editorRef,
  editorModel,
  euiTheme,
  contextKeyId,
  rejectAction,
  editSourceId,
  isReplaceMode = alwaysReplace,
  previewPendingRef,
  onAfterAccept,
  onAfterReject,
}: UseReplaceReviewParams) => {
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | undefined>(undefined);
  const widgetRef = useRef<ReviewActionsWidget | undefined>(undefined);
  const actionDisposablesRef = useRef<monaco.IDisposable[]>([]);
  const contextKeyRef = useRef<monaco.editor.IContextKey<boolean> | undefined>(undefined);
  const reviewStateRef = useRef<ReviewState | null>(null);
  const generatedBlockIndexRef = useRef<number | undefined>(undefined);
  const isEditedRef = useRef(false);

  const cleanup = useCallback(() => {
    // Clear before any follow-up edit so accept/reject still publish.
    if (previewPendingRef) previewPendingRef.current = false;

    decorationsRef.current?.clear();
    decorationsRef.current = undefined;

    widgetRef.current?.dispose();
    widgetRef.current = undefined;

    actionDisposablesRef.current.forEach((d) => d.dispose());
    actionDisposablesRef.current = [];

    contextKeyRef.current?.set(false);
    reviewStateRef.current = null;
    generatedBlockIndexRef.current = undefined;
    isEditedRef.current = false;
  }, [previewPendingRef]);

  useEffect(() => cleanup, [cleanup]);

  const dismiss = useCallback(() => {
    const editor = editorRef.current;
    const model = editorModel.current;
    const blockIndex = generatedBlockIndexRef.current;
    const block =
      blockIndex === undefined ? null : decorationsRef.current?.getRange(blockIndex) ?? null;

    cleanup();

    if (!editor || !model || !block || block.isEmpty()) return;

    const lineBefore = block.startLineNumber - 1;
    editor.executeEdits(`${editSourceId}-reject`, [
      {
        range: new monaco.Range(
          lineBefore,
          model.getLineMaxColumn(lineBefore),
          block.endLineNumber,
          model.getLineMaxColumn(block.endLineNumber)
        ),
        text: null,
      },
    ]);
  }, [editorRef, editorModel, cleanup, editSourceId]);

  const reject = useCallback(() => {
    const state = reviewStateRef.current;
    dismiss();
    if (state) onAfterReject?.(state);
  }, [dismiss, onAfterReject]);

  const accept = useCallback(() => {
    const editor = editorRef.current;
    const model = editorModel.current;
    const state = reviewStateRef.current;

    if (state && isEditedRef.current) {
      dismiss();
      return false;
    }

    cleanup();

    if (!editor || !model || !state) return false;

    const { firstChangedOriginalLine: first, lastChangedOriginalLine: last } = state;
    if (last >= first) {
      // A replaced last line has no following newline, so remove the preceding one instead.
      const isLastLine = last >= model.getLineCount() && first > 1;
      editor.executeEdits(`${editSourceId}-accept`, [
        {
          range: isLastLine
            ? new monaco.Range(
                first - 1,
                model.getLineMaxColumn(first - 1),
                last,
                model.getLineMaxColumn(last)
              )
            : new monaco.Range(first, 1, last + 1, 1),
          text: null,
        },
      ]);
    }

    onAfterAccept?.(state, model.getValue());
    return true;
  }, [editorRef, editorModel, cleanup, dismiss, editSourceId, onAfterAccept]);

  const showReview = useCallback(
    (state: ReviewState) => {
      const editor = editorRef.current;
      if (!editor) return;

      reviewStateRef.current = state;

      const model = editorModel.current;
      if (!model) return;

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      if (state.lastChangedOriginalLine >= state.firstChangedOriginalLine) {
        decorations.push({
          range: new monaco.Range(
            state.firstChangedOriginalLine,
            1,
            state.lastChangedOriginalLine,
            model.getLineMaxColumn(state.lastChangedOriginalLine)
          ),
          options: { isWholeLine: true, className: LINE_REPLACED_CLASS },
        });
      }

      if (state.generatedLineEnd >= state.generatedLineStart) {
        generatedBlockIndexRef.current = decorations.length;
        decorations.push({
          range: new monaco.Range(
            state.generatedLineStart,
            1,
            state.generatedLineEnd,
            model.getLineMaxColumn(state.generatedLineEnd)
          ),
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
        // Below both blocks, whichever comes first.
        Math.max(state.generatedLineEnd, state.lastChangedOriginalLine),
        { onAccept: accept, onReject: reject },
        isReplaceMode(state)
      );

      const activeElement = document.activeElement;
      const focusLeftEditor =
        activeElement !== null &&
        activeElement !== document.body &&
        !editor.getDomNode()?.contains(activeElement);
      if (!focusLeftEditor) {
        editor.revealLineInCenter(state.generatedLineEnd);
        widgetRef.current.focus();
      }

      actionDisposablesRef.current = [
        editor.addAction({
          id: rejectAction.id,
          label: rejectAction.label,
          // eslint-disable-next-line no-bitwise
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Backspace],
          precondition: contextKeyId,
          run: () => reject(),
        }),
        editor.onDidChangeModelContent(() => {
          isEditedRef.current = true;
        }),
      ];
    },
    [editorRef, editorModel, euiTheme, contextKeyId, rejectAction, isReplaceMode, accept, reject]
  );

  return { showReview, cleanup, dismiss, reject, accept, reviewStateRef };
};
