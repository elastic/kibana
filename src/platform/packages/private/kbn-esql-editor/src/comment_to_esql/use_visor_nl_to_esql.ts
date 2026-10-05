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
import { useReplaceReview } from './use_replace_review';
import type { ReviewState } from './use_replace_review';
import { getVisorNlInsertPlan } from './visor_nl_insert';

interface UseVisorNlToEsqlParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  onSubmit: (query: string) => void;
  onAfterInsert?: () => void;
  telemetryService?: ESQLEditorTelemetryService;
}

export const useVisorNlToEsql = ({
  editorRef,
  editorModel,
  onSubmit,
  onAfterInsert,
  telemetryService,
}: UseVisorNlToEsqlParams) => {
  const { euiTheme } = useEuiTheme();
  const generatedContentRef = useRef<string>('');
  const isSupersedingRef = useRef(false);

  const onAfterAccept = useCallback(
    ({ generatedLineStart, generatedLineEnd }: ReviewState) => {
      telemetryService?.trackVisorNlReviewed({
        action: AiReviewAction.ACCEPT,
        linesChanged: generatedLineEnd - generatedLineStart + 1,
      });
      onSubmit(generatedContentRef.current);
    },
    [onSubmit, telemetryService]
  );

  const onAfterReject = useCallback(
    ({ generatedLineStart, generatedLineEnd }: ReviewState) => {
      if (isSupersedingRef.current) return;
      telemetryService?.trackVisorNlReviewed({
        action: AiReviewAction.REJECT,
        linesChanged: generatedLineEnd - generatedLineStart + 1,
      });
    },
    [telemetryService]
  );

  const acceptAction = useMemo(
    () => ({
      id: 'esql.visorReview.accept',
      label: i18n.translate('esqlEditor.visor.review.acceptLabel', {
        defaultMessage: 'Replace with generated query',
      }),
    }),
    []
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

  const { showReview, reject } = useReplaceReview({
    editorRef,
    editorModel,
    euiTheme,
    contextKeyId: 'esqlVisorReviewActive',
    acceptAction,
    rejectAction,
    editSourceId: 'nl-to-esql-visor',
    onAfterAccept,
    onAfterReject,
  });

  const showVisorReview = useCallback(
    (generatedContent: string) => {
      const editor = editorRef.current;
      const model = editorModel.current;
      if (!editor || !model) return;

      // Revert any outstanding review so the next plan is against the original query,
      // not leftover generated lines from the previous result.
      isSupersedingRef.current = true;
      reject();
      isSupersedingRef.current = false;

      generatedContentRef.current = generatedContent;

      const plan = getVisorNlInsertPlan(model.getValue().split('\n'), generatedContent.split('\n'));
      if (!plan) return;

      if (plan.insert) {
        const { lastChangedOriginalLine } = plan.review;
        if (plan.insert.isLastLine) {
          const lineContent = model.getLineContent(lastChangedOriginalLine);
          editor.executeEdits('nl-to-esql-visor', [
            {
              range: new monaco.Range(
                lastChangedOriginalLine,
                lineContent.length + 1,
                lastChangedOriginalLine,
                lineContent.length + 1
              ),
              text: plan.insert.text,
              forceMoveMarkers: true,
            },
          ]);
        } else {
          editor.executeEdits('nl-to-esql-visor', [
            {
              range: new monaco.Range(
                lastChangedOriginalLine + 1,
                1,
                lastChangedOriginalLine + 1,
                1
              ),
              text: plan.insert.text,
              forceMoveMarkers: true,
            },
          ]);
        }
      }

      onAfterInsert?.();

      showReview(plan.review);
    },
    [editorRef, editorModel, reject, showReview, onAfterInsert]
  );

  return { showVisorReview };
};
