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
import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { findChangedRegion } from '../suggest_fix/utils';
import { useReplaceReview } from './use_replace_review';

interface UseVisorNlToEsqlParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  onSubmit: (query: string) => void;
}

export const useVisorNlToEsql = ({ editorRef, editorModel, onSubmit }: UseVisorNlToEsqlParams) => {
  const { euiTheme } = useEuiTheme();
  const generatedContentRef = useRef<string>('');

  const { showReview, cleanup } = useReplaceReview({
    editorRef,
    editorModel,
    euiTheme,
    contextKeyId: 'esqlVisorReviewActive',
    acceptAction: {
      id: 'esql.visorReview.accept',
      label: i18n.translate('esqlEditor.visor.review.acceptLabel', {
        defaultMessage: 'Replace with generated query',
      }),
    },
    rejectAction: {
      id: 'esql.visorReview.reject',
      label: i18n.translate('esqlEditor.visor.review.rejectLabel', {
        defaultMessage: 'Undo generated query',
      }),
    },
    editSourceId: 'nl-to-esql-visor',
    onAfterAccept: () => onSubmit(generatedContentRef.current),
  });

  const showVisorReview = useCallback(
    (generatedContent: string) => {
      const editor = editorRef.current;
      const model = editorModel.current;
      if (!editor || !model) return;

      cleanup();

      generatedContentRef.current = generatedContent;

      const originalLines = model.getValue().split('\n');
      const generatedLines = generatedContent.split('\n');

      const { prefixLen, suffixLen } = findChangedRegion(originalLines, generatedLines);

      const firstChangedOriginalLine = prefixLen + 1;
      const lastChangedOriginalLine = originalLines.length - suffixLen;
      const genChangedLines = generatedLines.slice(prefixLen, generatedLines.length - suffixLen);

      if (genChangedLines.length === 0 && firstChangedOriginalLine > lastChangedOriginalLine)
        return;

      const insertText = genChangedLines.join('\n') + '\n';
      const isLastLine = lastChangedOriginalLine >= model.getLineCount();

      if (isLastLine) {
        const lineContent = model.getLineContent(lastChangedOriginalLine);
        editor.executeEdits('nl-to-esql-visor', [
          {
            range: new monaco.Range(
              lastChangedOriginalLine,
              lineContent.length + 1,
              lastChangedOriginalLine,
              lineContent.length + 1
            ),
            text: '\n' + insertText,
            forceMoveMarkers: true,
          },
        ]);
      } else {
        editor.executeEdits('nl-to-esql-visor', [
          {
            range: new monaco.Range(lastChangedOriginalLine + 1, 1, lastChangedOriginalLine + 1, 1),
            text: insertText,
            forceMoveMarkers: true,
          },
        ]);
      }

      showReview({
        firstChangedOriginalLine,
        lastChangedOriginalLine,
        generatedLineStart: lastChangedOriginalLine + 1,
        generatedLineEnd: lastChangedOriginalLine + genChangedLines.length,
      });
    },
    [editorRef, editorModel, cleanup, showReview]
  );

  return { showVisorReview };
};
