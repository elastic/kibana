/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { NL_TO_ESQL_ROUTE, QuerySource } from '@kbn/esql-types';
import type { CoreStart } from '@kbn/core/public';
import { isMac } from '@kbn/shared-ux-utility';

enum NLSyncStatus {
  Synced = 'synced',
  OutOfSync = 'out_of_sync',
}

interface NLSyncState {
  prompt: string;
  generatedQuery: string;
}

interface UseNLToEsqlArgs {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>;
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
  onQuerySubmit: (source: QuerySource) => void;
  isEnabled: boolean;
}

const COMMENT_PREFIX_REGEX = /^\/\/\s*/;
const SYNC_INDICATOR_WIDTH = '3px';
const SYNCED_CLASS = 'esqlNlSyncIndicatorSynced';
const OUT_OF_SYNC_CLASS = 'esqlNlSyncIndicatorOutOfSync';
const HINT_CLASS = 'esqlNlGhostHint';
const WAND_CLASS = 'esqlNlMagicWand';
const COMMAND_KEY = isMac ? '\u2318' : 'Ctrl';

const WAND_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="FILL_COLOR"><path d="M12.1 1.3a1 1 0 011.4 0l1.2 1.2a1 1 0 010 1.4L6.5 12.1 3 13l.9-3.5L12.1 1.3zm-.7 2.7l1.6 1.6.6-.6-1.6-1.6-.6.6z"/><path d="M4.5 0c.27 1.62.63 1.98 2.25 2.25-1.62.27-1.98.63-2.25 2.25-.27-1.62-.63-1.98-2.25-2.25C3.87.27 4.23-.09 4.5 0z"/></svg>`;

/**
 * Extracts consecutive leading `//` comment lines from the editor model.
 * Returns the number of comment lines and the combined natural language text.
 */
export function extractLeadingComment(model: monaco.editor.ITextModel): {
  commentLineCount: number;
  commentText: string;
} {
  const lineCount = model.getLineCount();
  let commentLineCount = 0;
  // Supports multiple comment lines
  const commentParts: string[] = [];

  for (let lineNum = 1; lineNum <= lineCount; lineNum++) {
    const line = model.getLineContent(lineNum).trim();
    if (line.startsWith('//')) {
      commentLineCount = lineNum;
      // Remove the comment prefix from the line
      commentParts.push(line.replace(COMMENT_PREFIX_REGEX, ''));
    } else {
      break;
    }
  }

  return { commentLineCount, commentText: commentParts.join(' ').trim() };
}

function getEsqlBody(model: monaco.editor.ITextModel, commentLineCount: number): string {
  const lineCount = model.getLineCount();
  const bodyLines: string[] = [];

  for (let lineNum = commentLineCount + 1; lineNum <= lineCount; lineNum++) {
    bodyLines.push(model.getLineContent(lineNum));
  }

  return bodyLines.join('\n').trim();
}

export const useNLToEsql = ({
  editorRef,
  editorModel,
  http,
  notifications,
  onQuerySubmit,
  isEnabled,
}: UseNLToEsqlArgs) => {
  const { euiTheme } = useEuiTheme();
  const syncStateRef = useRef<NLSyncState | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const hintDecorationIdsRef = useRef<string[]>([]);
  const wandDecorationIdsRef = useRef<string[]>([]);
  const isGeneratingRef = useRef(false);

  const isEnabledRef = useRef(isEnabled);
  isEnabledRef.current = isEnabled;
  const onQuerySubmitRef = useRef(onQuerySubmit);
  onQuerySubmitRef.current = onQuerySubmit;

  const wandSvgEncoded = encodeURIComponent(
    WAND_ICON_SVG.replaceAll('FILL_COLOR', euiTheme.colors.text)
  );

  const nlSyncDecorationStyle = css`
    .${SYNCED_CLASS} {
      background: ${euiTheme.colors.success};
      width: ${SYNC_INDICATOR_WIDTH} !important;
      margin-left: ${SYNC_INDICATOR_WIDTH};
    }
    .${OUT_OF_SYNC_CLASS} {
      background: ${euiTheme.colors.warning};
      width: ${SYNC_INDICATOR_WIDTH} !important;
      margin-left: ${SYNC_INDICATOR_WIDTH};
    }
    .${HINT_CLASS}::after {
      content: '  Press ${COMMAND_KEY}+J to generate ES|QL';
      color: ${euiTheme.colors.textSubdued};
      font-style: italic;
      opacity: 0.6;
    }
    .${WAND_CLASS} {
      background-image: url('data:image/svg+xml,${wandSvgEncoded}');
      background-size: 18px 18px;
      background-repeat: no-repeat;
      background-position: center;
      width: 20px !important;
      cursor: pointer;
      opacity: 0.8;
    }
    .${WAND_CLASS}:hover {
      opacity: 1;
    }
  `;

  const updateDecorations = useCallback(
    (commentLineCount: number, status: NLSyncStatus | null) => {
      const model = editorModel.current;
      if (!model) return;

      if (status === null || commentLineCount === 0) {
        // Clear the decorations
        decorationIdsRef.current = model.deltaDecorations(decorationIdsRef.current, []);
        return;
      }

      const className = status === NLSyncStatus.Synced ? SYNCED_CLASS : OUT_OF_SYNC_CLASS;
      const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

      for (let lineNum = 1; lineNum <= commentLineCount; lineNum++) {
        newDecorations.push({
          range: new monaco.Range(lineNum, 1, lineNum, 1),
          options: {
            isWholeLine: true,
            linesDecorationsClassName: className,
          },
        });
      }

      decorationIdsRef.current = model.deltaDecorations(decorationIdsRef.current, newDecorations);
    },
    [editorModel]
  );

  const updateHintDecoration = useCallback(
    (show: boolean, lastCommentLine: number) => {
      const model = editorModel.current;
      if (!model) return;

      if (!show) {
        hintDecorationIdsRef.current = model.deltaDecorations(hintDecorationIdsRef.current, []);
        return;
      }

      hintDecorationIdsRef.current = model.deltaDecorations(hintDecorationIdsRef.current, [
        {
          range: new monaco.Range(lastCommentLine, 1, lastCommentLine, 1),
          options: {
            isWholeLine: true,
            afterContentClassName: HINT_CLASS,
          },
        },
      ]);
    },
    [editorModel]
  );

  const updateWandDecoration = useCallback(
    (show: boolean) => {
      const model = editorModel.current;
      if (!model) return;

      if (!show) {
        wandDecorationIdsRef.current = model.deltaDecorations(wandDecorationIdsRef.current, []);
        return;
      }

      wandDecorationIdsRef.current = model.deltaDecorations(wandDecorationIdsRef.current, [
        {
          range: new monaco.Range(1, 1, 1, 1),
          options: {
            isWholeLine: true,
            linesDecorationsClassName: WAND_CLASS,
          },
        },
      ]);
    },
    [editorModel]
  );

  const handleWandClick = useCallback(
    (e: monaco.editor.IEditorMouseEvent): boolean => {
      if (!isEnabledRef.current) return false;
      if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS) return false;
      if (e.target.position?.lineNumber !== 1) return false;

      const model = editorModel.current;
      const editor = editorRef.current;
      if (!model || !editor) return false;

      const { commentLineCount } = extractLeadingComment(model);
      if (commentLineCount > 0) return false;

      e.event.preventDefault();
      e.event.stopPropagation();

      const placeholder = `// Describe your query in plain language.`;
      editor.executeEdits('nl-to-esql-wand', [
        {
          range: new monaco.Range(1, 1, 1, 1),
          text: placeholder + '\n',
        },
      ]);

      const selection = new monaco.Selection(1, 4, 1, placeholder.length + 1);
      editor.setSelection(selection);
      editor.focus();
      return true;
    },
    [editorModel, editorRef]
  );

  const updateNlSyncDecorations = useCallback(() => {
    if (!isEnabledRef.current) return;

    const model = editorModel.current;
    const editor = editorRef.current;
    if (!model || !editor) return;

    const { commentLineCount, commentText } = extractLeadingComment(model);
    const syncState = syncStateRef.current;

    if (commentLineCount === 0) {
      syncStateRef.current = null;
      updateDecorations(0, null);
      updateHintDecoration(false, 0);
      updateWandDecoration(true);
      return;
    }

    updateWandDecoration(false);

    const cursorLine = editor.getPosition()?.lineNumber ?? 0;
    const cursorOnComment = cursorLine >= 1 && cursorLine <= commentLineCount;
    updateHintDecoration(cursorOnComment && Boolean(commentText), commentLineCount);

    if (!syncState) {
      updateDecorations(0, null);
      return;
    }

    const currentBody = getEsqlBody(model, commentLineCount);
    const commentChanged = commentText !== syncState.prompt;
    const queryChanged = currentBody !== syncState.generatedQuery;

    const status = commentChanged || queryChanged ? NLSyncStatus.OutOfSync : NLSyncStatus.Synced;

    updateDecorations(commentLineCount, status);
  }, [editorModel, editorRef, updateDecorations, updateHintDecoration, updateWandDecoration]);

  const generateFromComment = useCallback(async () => {
    if (!isEnabledRef.current || isGeneratingRef.current) return;

    const model = editorModel.current;
    const editor = editorRef.current;
    if (!model || !editor) return;

    const { commentLineCount, commentText } = extractLeadingComment(model);

    // If there is no comment or the comment is empty, show a toast
    // when the user tries to generate a query from a comment.
    if (commentLineCount === 0 || !commentText) {
      notifications.toasts.addInfo({
        title: i18n.translate('esqlEditor.nlToEsql.noCommentTitle', {
          defaultMessage: 'No comment found',
        }),
        text: i18n.translate('esqlEditor.nlToEsql.noCommentText', {
          defaultMessage:
            'Add a comment starting with // on the first line to generate ES|QL from natural language.',
        }),
      });
      return;
    }

    isGeneratingRef.current = true;
    updateHintDecoration(false, 0);

    try {
      const currentBody = getEsqlBody(model, commentLineCount);
      const indexPattern = currentBody ? getIndexPatternFromESQLQuery(currentBody) : undefined;
      const sources = indexPattern
        ? indexPattern
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      const result = await http.post<{ content: string }>(NL_TO_ESQL_ROUTE, {
        body: JSON.stringify({
          query: commentText,
          sources: sources?.length ? sources : undefined,
        }),
      });

      if (result.content) {
        const generatedQuery = result.content;

        const commentLines: string[] = [];
        for (let lineNum = 1; lineNum <= commentLineCount; lineNum++) {
          commentLines.push(model.getLineContent(lineNum));
        }
        const fullText = commentLines.join('\n') + '\n' + generatedQuery;

        const fullRange = model.getFullModelRange();
        editor.executeEdits('nl-to-esql', [{ range: fullRange, text: fullText }]);

        const lastLine = model.getLineCount();
        const lastColumn = model.getLineMaxColumn(lastLine);
        editor.setPosition({ lineNumber: lastLine, column: lastColumn });

        syncStateRef.current = {
          prompt: commentText,
          generatedQuery,
        };

        updateDecorations(commentLineCount, NLSyncStatus.Synced);

        // executeEdits already triggers onChange → onTextLangQueryChange;
        // we just need to submit the query after the state has propagated.
        setTimeout(() => {
          onQuerySubmitRef.current(QuerySource.NATURAL_LANGUAGE);
        }, 0);
      }
    } catch (error) {
      const message =
        (error as { body?: { message?: string } })?.body?.message ??
        i18n.translate('esqlEditor.nlToEsql.generateError', {
          defaultMessage: 'Failed to generate ES|QL query from comment',
        });
      notifications.toasts.addDanger({ title: message });
    } finally {
      isGeneratingRef.current = false;
    }
  }, [editorModel, editorRef, http, notifications.toasts, updateDecorations, updateHintDecoration]);

  return {
    generateFromComment,
    nlSyncDecorationStyle,
    updateNlSyncDecorations,
    handleWandClick,
  };
};
