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
import { i18n } from '@kbn/i18n';
import { useCallback, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { AiReviewAction, type ESQLEditorTelemetryService } from '../telemetry/telemetry_service';
import type { VisorNlResultHandler } from '../types';
import { runWithPublishHold } from './query_publish_gate';
import type { QueryPublishGateRef } from './query_publish_gate';
import { useReplaceReview } from './use_replace_review';
import type { ReviewState } from './use_replace_review';
import { getVisorNlInsertPlan } from './visor_nl_insert';

interface UseVisorNlToEsqlParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  onSubmit: (query: string) => void;
  onAfterInsert?: () => void;
  telemetryService?: ESQLEditorTelemetryService;
  queryPublishGate: QueryPublishGateRef;
}

const generatedBlockStillPresent = (
  model: monaco.editor.ITextModel,
  state: ReviewState,
  block: string
): boolean => {
  if (!block || state.generatedLineEnd < state.generatedLineStart) return false;
  if (model.getLineCount() < state.generatedLineEnd) return false;

  const lines: string[] = [];
  for (let line = state.generatedLineStart; line <= state.generatedLineEnd; line++) {
    lines.push(model.getLineContent(line));
  }
  return lines.join('\n') === block;
};

export const useVisorNlToEsql = ({
  editorRef,
  editorModel,
  onSubmit,
  onAfterInsert,
  telemetryService,
  queryPublishGate,
}: UseVisorNlToEsqlParams) => {
  const { euiTheme } = useEuiTheme();
  const reviewRef = useRef<Parameters<VisorNlResultHandler>[1] | undefined>(undefined);
  const isSupersedingRef = useRef(false);
  const isDismissingEditRef = useRef(false);
  const untouchedPreviewRef = useRef<string | null>(null);
  const generatedBlockRef = useRef('');

  const clearPreviewSnapshot = useCallback(() => {
    untouchedPreviewRef.current = null;
    generatedBlockRef.current = '';
  }, []);

  const onAfterAccept = useCallback(
    ({ generatedLineStart, generatedLineEnd }: ReviewState, acceptedQuery: string) => {
      clearPreviewSnapshot();
      telemetryService?.trackVisorNlReviewed({
        action: AiReviewAction.ACCEPT,
        linesChanged: generatedLineEnd - generatedLineStart + 1,
      });
      // Submit the editor text after the original lines are removed, including
      // any edits the user made to the generated lines.
      onSubmit(acceptedQuery);
      reviewRef.current?.onAccept();
    },
    [clearPreviewSnapshot, onSubmit, telemetryService]
  );

  const onAfterReject = useCallback(
    ({ generatedLineStart, generatedLineEnd }: ReviewState) => {
      clearPreviewSnapshot();
      if (isSupersedingRef.current || isDismissingEditRef.current) return;
      telemetryService?.trackVisorNlReviewed({
        action: AiReviewAction.REJECT,
        linesChanged: generatedLineEnd - generatedLineStart + 1,
      });
      reviewRef.current?.onReject?.();
    },
    [clearPreviewSnapshot, telemetryService]
  );

  const rejectAction = useMemo(
    () => ({
      id: 'esql.visorReview.reject',
      label: i18n.translate('esqlEditor.visor.review.rejectLabel', {
        defaultMessage: 'Undo generated query',
      }),
    }),
    []
  );

  const {
    showReview,
    reject,
    accept: acceptReplacement,
    cleanup: discardReviewUi,
    getReviewState,
  } = useReplaceReview({
    editorRef,
    editorModel,
    euiTheme,
    contextKeyId: 'esqlVisorReviewActive',
    rejectAction,
    editSourceId: 'nl-to-esql-visor',
    queryPublishGate,
    onAfterAccept,
    onAfterReject,
  });

  const discardReview = useCallback(() => {
    clearPreviewSnapshot();
    discardReviewUi();
  }, [clearPreviewSnapshot, discardReviewUi]);

  const showVisorReview = useCallback<VisorNlResultHandler>(
    (generatedContent, review) => {
      const editor = editorRef.current;
      const model = editorModel.current;
      if (!editor || !model) return;

      // Revert any outstanding review so the next plan is against the original query,
      // not leftover generated lines from the previous result.
      isSupersedingRef.current = true;
      reject();
      isSupersedingRef.current = false;

      reviewRef.current = review;

      const plan = getVisorNlInsertPlan(model.getValue().split('\n'), generatedContent.split('\n'));
      if (!plan) return;

      const insertAndReview = () => {
        if (plan.insert) {
          const { lastChangedOriginalLine } = plan.review;
          const insertAtLineEnd = plan.insert.isLastLine;
          const insertLine = insertAtLineEnd
            ? lastChangedOriginalLine
            : lastChangedOriginalLine + 1;
          const insertColumn = insertAtLineEnd ? model.getLineContent(insertLine).length + 1 : 1;
          editor.executeEdits('nl-to-esql-visor', [
            {
              range: new monaco.Range(insertLine, insertColumn, insertLine, insertColumn),
              text: plan.insert.text,
              forceMoveMarkers: true,
            },
          ]);
        }

        const { generatedLineStart, generatedLineEnd } = plan.review;
        const blockLines: string[] = [];
        for (let line = generatedLineStart; line <= generatedLineEnd; line++) {
          blockLines.push(model.getLineContent(line));
        }
        generatedBlockRef.current = blockLines.join('\n');
        untouchedPreviewRef.current = model.getValue();

        onAfterInsert?.();
        showReview(plan.review);
      };

      if (plan.insert) {
        runWithPublishHold(queryPublishGate, insertAndReview);
      } else {
        insertAndReview();
      }
    },
    [editorRef, editorModel, reject, showReview, onAfterInsert, queryPublishGate]
  );

  // Run accepts an untouched preview. Once the user has edited the buffer, drop the
  // suggestion instead of restoring the text that was generated.
  const acceptReview = useCallback(() => {
    const model = editorModel.current;
    const snapshot = untouchedPreviewRef.current;
    if (model && snapshot != null && model.getValue() !== snapshot) {
      const state = getReviewState();
      if (state && generatedBlockStillPresent(model, state, generatedBlockRef.current)) {
        isDismissingEditRef.current = true;
        reject();
        isDismissingEditRef.current = false;
      } else {
        discardReview();
      }
      return false;
    }
    return acceptReplacement();
  }, [editorModel, getReviewState, reject, discardReview, acceptReplacement]);

  return { showVisorReview, acceptReview, discardReview };
};
