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
import { findFirstCommandPosition } from './utils';

interface UseSourcesBadgeParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  openIndicesBrowser: (options?: { openedFrom?: 'badge' | 'autocomplete' }) => void;
}

export const useSourcesBadge = ({ editorRef, editorModel, openIndicesBrowser }: UseSourcesBadgeParams) => {
  const { euiTheme } = useEuiTheme();
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | undefined>(undefined);

  const sourcesBadgeClassName = 'esqlSourcesBadge';

  const sourcesBadgeStyle = css`
    .${sourcesBadgeClassName} {
      cursor: pointer;
      display: inline-block;
      vertical-align: middle;
      padding-block: 0px;
      padding-inline: 2px;
      max-inline-size: 100%;
      font-size: 0.8571rem;
      line-height: 18px;
      font-weight: 500;
      white-space: nowrap;
      text-decoration: none;
      border-radius: 3px;
      text-align: start;
      border-width: 1px;
      border-style: solid;
      color: ${euiTheme.colors.plainLight} !important;
      background-color: ${euiTheme.colors.primary};
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
    // Assumption: the query contains either FROM or TS (but not both).
    const fromPos = findFirstCommandPosition(queryText, 'FROM');
    const first = fromPos
      ? ({ length: 4, pos: fromPos } as const)
      : (() => {
          const tsPos = findFirstCommandPosition(queryText, 'TS');
          return tsPos ? ({ length: 2, pos: tsPos } as const) : undefined;
        })();

    if (first) {
      collections.push({
        range: new monaco.Range(
          first.pos.lineNumber,
          first.pos.startColumn,
          first.pos.lineNumber,
          first.pos.startColumn + first.length
        ),
        options: {
          isWholeLine: false,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          inlineClassName: sourcesBadgeClassName,
        },
      });
    }

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

      const word = currentWord.word.toUpperCase();
      if (word !== 'FROM' && word !== 'TS') return;

      const queryText = model.getValue() ?? '';
      const commandPosition = findFirstCommandPosition(queryText, word);
      if (!commandPosition) return;

      if (
        commandPosition.lineNumber === mousePosition.lineNumber &&
        currentWord.startColumn >= commandPosition.startColumn &&
        currentWord.endColumn <= commandPosition.startColumn + word.length
      ) {
        const positionAfterCommand = new monaco.Position(
          commandPosition.lineNumber,
          commandPosition.startColumn + word.length + 1
        );
        editor.setPosition(positionAfterCommand);
        editor.revealPosition(positionAfterCommand);
        openIndicesBrowser({ openedFrom: 'badge' });
      }
    },
    [editorModel, editorRef, openIndicesBrowser]
  );

  const sourcesLabelKeyDownHandler = useCallback(
    (e: monaco.IKeyboardEvent) => {
      const editor = editorRef.current;
      const model = editorModel.current;
      if (!editor || !model) return;

      if (e.keyCode !== monaco.KeyCode.DownArrow) return;

      const currentPosition = editor.getPosition();
      if (!currentPosition) return;

      const currentWord = model.getWordAtPosition(currentPosition);
      if (!currentWord) return;

      const word = currentWord.word.toUpperCase();
      if (word !== 'FROM' && word !== 'TS') return;

      const queryText = model.getValue() ?? '';
      const commandPosition = findFirstCommandPosition(queryText, word);
      if (!commandPosition) return;

      if (
        commandPosition.lineNumber === currentPosition.lineNumber &&
        currentWord.startColumn >= commandPosition.startColumn &&
        currentWord.endColumn <= commandPosition.startColumn + word.length
      ) {
        e.preventDefault();
        const positionAfterCommand = new monaco.Position(
          commandPosition.lineNumber,
          commandPosition.startColumn + word.length + 1
        );
        editor.setPosition(positionAfterCommand);
        editor.revealPosition(positionAfterCommand);
        setTimeout(() => {
          editor.trigger(undefined, 'editor.action.triggerSuggest', {});
        }, 0);
      }
    },
    [editorModel, editorRef]
  );

  return {
    addSourcesDecorator,
    sourcesBadgeStyle,
    sourcesLabelClickHandler,
    sourcesLabelKeyDownHandler,
  };
};

