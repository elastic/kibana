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
import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { getSupportedCommand } from './utils';
import { IndicesBrowserOpenMode } from './types';
import { SUPPORTED_COMMANDS } from './constants';

interface UseSourcesBadgeParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  openIndicesBrowser: (options?: { openedFrom?: IndicesBrowserOpenMode }) => void;
}

export const useSourcesBadge = ({
  editorRef,
  editorModel,
  openIndicesBrowser,
}: UseSourcesBadgeParams) => {
  const { euiTheme } = useEuiTheme();
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | undefined>(undefined);

  const sourcesBadgeClassName = 'esqlSourcesBadge';

  const sourcesBadgeStyle = css`
    .${sourcesBadgeClassName} {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      padding: ${euiTheme.size.xs} ${euiTheme.size.s};
      max-inline-size: 100%;
      font-size: ${euiTheme.font.scale.s};
      font-weight: ${euiTheme.font.weight.medium} !important;
      line-height: 1;
      white-space: nowrap;
      text-decoration: none;
      border-radius: ${euiTheme.size.xl};
      text-align: start;
      color: ${euiTheme.colors.primary} !important;
      background-color: ${euiTheme.colors.backgroundBasePrimary} !important;
      box-sizing: border-box;
    }
  `;

  const addSourcesDecorator = useCallback(() => {
    const editor = editorRef.current;
    const model = editorModel.current;
    if (!editor || !model) return;

    decorationsRef.current?.clear();

    const queryText = model.getValue() ?? '';
    if (!queryText.trim()) return;

    const collections: monaco.editor.IModelDeltaDecoration[] = [];
    const firstSupportedCommand = getSupportedCommand(queryText);

    if (!firstSupportedCommand || !firstSupportedCommand.range) return;
    collections.push({
      range: new monaco.Range(
        firstSupportedCommand.range.lineNumber,
        firstSupportedCommand.range.startColumn,
        firstSupportedCommand.range.lineNumber,
        firstSupportedCommand.range.endColumn
      ),
      options: {
        isWholeLine: false,
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        inlineClassName: sourcesBadgeClassName,
      },
    });

    if (collections.length > 0) {
      decorationsRef.current = editor.createDecorationsCollection(collections);
    }
  }, [editorModel, editorRef, sourcesBadgeClassName]);

  const sourcesLabelClickHandler = useCallback(
    (e: monaco.editor.IEditorMouseEvent) => {
      const editor = editorRef.current;
      const model = editorModel.current;
      if (!editor || !model) return;

      const mousePosition = e.target.position;
      if (!mousePosition) return;

      const currentWord = model.getWordAtPosition(mousePosition);
      if (!currentWord) return;

      const word = currentWord.word.toLowerCase();
      if (!SUPPORTED_COMMANDS.includes(word)) return;

      const queryText = model.getValue() ?? '';
      const firstSupportedCommand = getSupportedCommand(queryText);
      if (!firstSupportedCommand || !firstSupportedCommand.range) return;

      if (
        firstSupportedCommand.range.lineNumber === mousePosition.lineNumber &&
        currentWord.startColumn >= firstSupportedCommand.range.startColumn &&
        currentWord.endColumn <= firstSupportedCommand.range.endColumn
      ) {
        const positionAfterCommand = new monaco.Position(
          firstSupportedCommand.range.lineNumber,
          firstSupportedCommand.range.endColumn + 1
        );
        editor.setPosition(positionAfterCommand);
        editor.revealPosition(positionAfterCommand);
        openIndicesBrowser({ openedFrom: IndicesBrowserOpenMode.Badge });
      }
    },
    [editorModel, editorRef, openIndicesBrowser]
  );

  return {
    addSourcesDecorator,
    sourcesBadgeStyle,
    sourcesLabelClickHandler,
  };
};
