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
import { insertPendingPreview } from './preview_pending';
import type { PreviewPendingRef } from './preview_pending';
import { useReplaceReview } from './use_replace_review';
import type { ReviewState } from './use_replace_review';
import { getVisorNlInsertPlan } from './visor_nl_insert';

interface UseVisorNlToEsqlParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  onSubmit: (query: string) => void;
  onAfterInsert?: () => void;
  telemetryService?: ESQLEditorTelemetryService;
  previewPendingRef: PreviewPendingRef;
}

export const useVisorNlToEsql = ({
  editorRef,
  editorModel,
  onSubmit,
  onAfterInsert,
  telemetryService,
  previewPendingRef,
}: UseVisorNlToEsqlParams) => {
  const { euiTheme } = useEuiTheme();
  const reviewRef = useRef<Parameters<VisorNlResultHandler>[1] | undefined>(undefined);

  const onAfterAccept = useCallback(
    ({ generatedLineStart, generatedLineEnd }: ReviewState, acceptedQuery: string) => {
      telemetryService?.trackVisorNlReviewed({
        action: AiReviewAction.ACCEPT,
        linesChanged: generatedLineEnd - generatedLineStart + 1,
      });
      // Submit the editor text after the original lines are removed, including
      // any edits the user made to the generated lines.
      onSubmit(acceptedQuery);
      reviewRef.current?.onAccept();
    },
    [onSubmit, telemetryService]
  );

  const onAfterReject = useCallback(
    ({ generatedLineStart, generatedLineEnd }: ReviewState) => {
      telemetryService?.trackVisorNlReviewed({
        action: AiReviewAction.REJECT,
        linesChanged: generatedLineEnd - generatedLineStart + 1,
      });
      reviewRef.current?.onReject?.();
    },
    [telemetryService]
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
    dismiss,
    accept: acceptReview,
    cleanup: discardReview,
  } = useReplaceReview({
    editorRef,
    editorModel,
    euiTheme,
    contextKeyId: 'esqlVisorReviewActive',
    rejectAction,
    editSourceId: 'nl-to-esql-visor',
    previewPendingRef,
    onAfterAccept,
    onAfterReject,
  });

  const showVisorReview = useCallback<VisorNlResultHandler>(
    (generatedContent, review) => {
      const editor = editorRef.current;
      const model = editorModel.current;
      if (!editor || !model) return;

      // Revert any outstanding review so the next plan is against the original query,
      // not leftover generated lines from the previous result.
      dismiss();

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

        onAfterInsert?.();
        showReview(plan.review);
      };

      if (plan.insert) {
        insertPendingPreview(previewPendingRef, insertAndReview);
      } else {
        insertAndReview();
      }
    },
    [editorRef, editorModel, dismiss, showReview, onAfterInsert, previewPendingRef]
  );

  return { showVisorReview, acceptReview, discardReview };
};
