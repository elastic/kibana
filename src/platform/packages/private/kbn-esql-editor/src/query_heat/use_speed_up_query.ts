/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { OPTIMIZE_QUERY_ROUTE } from '@kbn/esql-types';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { GENERATING_HINT_CLASS } from '../editor_ai.styles';
import { useReplaceReview } from '../comment_to_esql/use_replace_review';
import { findChangedRegion } from '../suggest_fix/utils';
import { matchHeatToText } from './query_heat';
import type { EditorCommandHeat } from './query_heat';

interface UseSpeedUpQueryParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  http: HttpStart;
  notifications: NotificationsStart;
  /** The heat the user is looking at. Without its profile context the AI has nothing to go on. */
  heat?: EditorCommandHeat;
  isEnabled: boolean;
  /** Runs the query once the suggestion is kept. */
  onSubmit: (query: string) => void;
  onAfterInsert?: () => void;
}

interface OptimizeQueryResponse {
  query: string | null;
  reason: string;
}

/**
 * Asks the AI for a faster version of the query, focused on one command, and shows it as a review
 * in the editor: the changed lines are marked, and the user keeps them by running the query or
 * undoes them. Nothing runs until the user accepts.
 */
export const useSpeedUpQuery = ({
  editorRef,
  editorModel,
  http,
  notifications,
  heat,
  isEnabled,
  onSubmit,
  onAfterInsert,
}: UseSpeedUpQueryParams) => {
  const { euiTheme } = useEuiTheme();
  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const generatingRef = useRef<monaco.editor.IEditorDecorationsCollection | undefined>(undefined);

  const {
    showReview,
    reject: rejectReview,
    accept: acceptReview,
    cleanup: discardReview,
  } = useReplaceReview({
    editorRef,
    editorModel,
    euiTheme,
    contextKeyId: 'esqlSpeedUpReviewActive',
    rejectAction: {
      id: 'esql.speedUp.reject',
      label: i18n.translate('esqlEditor.queryHeat.rejectLabel', {
        defaultMessage: 'Undo AI suggestion',
      }),
    },
    editSourceId: 'esql-speed-up',
    onAfterAccept: (_state, acceptedQuery) => onSubmit(acceptedQuery),
  });

  const clearGenerating = useCallback(() => {
    generatingRef.current?.clear();
    generatingRef.current = undefined;
  }, []);

  const speedUp = useCallback(
    async (commandIndex: number) => {
      const editor = editorRef.current;
      const model = editorModel.current;
      if (!heat?.profileContext || !editor || !model) {
        return;
      }

      const queryString = model.getValue();
      const entry = matchHeatToText(heat, queryString)?.[commandIndex];
      if (!entry) {
        return;
      }

      clearGenerating();
      rejectReview();
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const end = model.getPositionAt(entry.end);
      const generating = editor.createDecorationsCollection([
        {
          range: new monaco.Range(end.lineNumber, end.column, end.lineNumber, end.column),
          options: { afterContentClassName: GENERATING_HINT_CLASS },
        },
      ]);
      generatingRef.current = generating;

      try {
        const result = await http.post<OptimizeQueryResponse>(OPTIMIZE_QUERY_ROUTE, {
          body: JSON.stringify({
            queryString,
            profileContext: heat.profileContext,
            focusCommand: queryString.slice(entry.start, entry.end),
          }),
          signal: controller.signal,
        });

        // The query was edited while the AI was working, so its answer no longer fits.
        if (controller.signal.aborted || model.getValue() !== queryString) {
          return;
        }

        if (!result.query) {
          notifications.toasts.addInfo({
            title: i18n.translate('esqlEditor.queryHeat.noImprovementTitle', {
              defaultMessage: 'No safe improvement found',
            }),
            text: result.reason,
          });
          return;
        }

        const improvedLines = result.query.replace(/\n+$/, '').split('\n');
        const originalLines = queryString.split('\n');
        const { prefixLen, suffixLen } = findChangedRegion(originalLines, improvedLines);
        const firstChangedOriginalLine = prefixLen + 1;
        const lastChangedOriginalLine = originalLines.length - suffixLen;
        const changedLines = improvedLines.slice(prefixLen, improvedLines.length - suffixLen);

        if (changedLines.length === 0 && firstChangedOriginalLine > lastChangedOriginalLine) {
          return;
        }

        const insertColumn = model.getLineMaxColumn(lastChangedOriginalLine);
        editor.executeEdits('esql-speed-up', [
          {
            range: new monaco.Range(
              lastChangedOriginalLine,
              insertColumn,
              lastChangedOriginalLine,
              insertColumn
            ),
            text: '\n' + changedLines.join('\n'),
            forceMoveMarkers: true,
          },
        ]);
        onAfterInsert?.();

        showReview({
          firstChangedOriginalLine,
          lastChangedOriginalLine,
          generatedLineStart: lastChangedOriginalLine + 1,
          generatedLineEnd: lastChangedOriginalLine + changedLines.length,
        });
        notifications.toasts.addInfo({
          title: i18n.translate('esqlEditor.queryHeat.suggestionReadyTitle', {
            defaultMessage: 'A faster version is ready to review',
          }),
          text: result.reason,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          (error as { body?: { message?: string } })?.body?.message ??
          i18n.translate('esqlEditor.queryHeat.error', {
            defaultMessage: 'The AI could not suggest a faster version of the query',
          });
        notifications.toasts.addDanger({ title: message });
      } finally {
        if (generatingRef.current === generating) {
          clearGenerating();
        }
      }
    },
    [
      editorRef,
      editorModel,
      heat,
      http,
      notifications.toasts,
      clearGenerating,
      rejectReview,
      showReview,
      onAfterInsert,
    ]
  );

  return {
    /** Undefined when there is nothing to base a suggestion on, or the AI is not available. */
    speedUp: isEnabled && heat?.profileContext ? speedUp : undefined,
    acceptReview,
    discardReview,
  };
};
