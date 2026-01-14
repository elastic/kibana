/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { monaco } from '@kbn/monaco';
import React, { useCallback, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { Parser } from '@kbn/esql-language';
import type { AggregateQuery } from '@kbn/es-query';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { findCommandStringPosition } from './utils';

/**
 * Hook to register a custom command in the ESQL editor for creating a resources badge.
 * @param editorRef
 * @param editorModel
 * @param query
 * @param getSources
 */
export const useResourcesBadge = (
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>,
  editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>,
  query: AggregateQuery,
  openIndicesBrowser: () => void,
  getSources?: () => Promise<ESQLSourceResult[]>
) => {
  const { euiTheme } = useEuiTheme();
  const resourcesOpenStatusRef = useRef<boolean>(false);
  const resourcesFromBadgeClassName = 'resourcesFromBadge';

  const resourcesBadgeStyle = css`
    .${resourcesFromBadgeClassName} {
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

  const addResourcesDecorator = useCallback(() => {
    // we need to remove the previous decorations first
    const lineCount = editorModel.current?.getLineCount() || 1;
    for (let i = 1; i <= lineCount; i++) {
      const decorations = editorRef.current?.getLineDecorations(i) ?? [];
      editorRef?.current?.removeDecorations(decorations.map((d) => d.id));
    }

    const { root } = Parser.parse(query.esql);
    const fromCommand = root.commands.find((command) => command.name === 'from');
    const tsCommand = root.commands.find((command) => command.name === 'ts');

    const fromStringPosition = fromCommand ? findCommandStringPosition(query.esql, 'from') : undefined;
    const tsStringPosition = tsCommand ? findCommandStringPosition(query.esql, 'ts') : undefined;
    if (!fromStringPosition && !tsStringPosition) {
      return;
    }

    const collections = [];

    if (fromStringPosition) {
      collections.push(
        {
          range: new monaco.Range(
            fromStringPosition.startLineNumber,
            fromStringPosition.min + 1,
            fromStringPosition.endLineNumber,
            fromStringPosition.max
          ),
          options: {
            isWholeLine: false,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            inlineClassName: resourcesFromBadgeClassName,
          },
        },
      );
    }
    if (tsStringPosition) {
      collections.push(
        {
          range: new monaco.Range(
            tsStringPosition.startLineNumber,
            tsStringPosition.min + 1,
            tsStringPosition.endLineNumber,
            tsStringPosition.max
          ),
          options: {
            isWholeLine: false,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            inlineClassName: resourcesFromBadgeClassName,
          },
        },
      );
    }

    editorRef?.current?.createDecorationsCollection(collections);
  }, [editorModel, editorRef, query.esql]);

  useEffect(
    function updateOnQueryChange() {
      addResourcesDecorator();
    },
    [query.esql, addResourcesDecorator]
  );

  const resourcesLabelClickHandler = useCallback(
    (e: monaco.editor.IEditorMouseEvent) => {
      const mousePosition = e.target.position;
      if (!mousePosition) return;

      const currentWord = editorModel.current?.getWordAtPosition(mousePosition);
      if (!currentWord) return;
      const fromStringPosition = findCommandStringPosition(query.esql, 'from');
      const tsStringPosition = findCommandStringPosition(query.esql, 'ts');

      if (
        currentWord.word === 'FROM' &&
        fromStringPosition &&
        fromStringPosition.startLineNumber !== -1 &&
        fromStringPosition.startLineNumber === mousePosition.lineNumber &&
        currentWord.startColumn >= fromStringPosition.min &&
        currentWord.endColumn <= fromStringPosition.max
      ) {
        // Move cursor to position after "FROM "
        const positionAfterCommand = new monaco.Position(
            fromStringPosition.startLineNumber,
            fromStringPosition.max + 1
          )
        editorRef.current?.setPosition(positionAfterCommand);
        editorRef.current?.revealPosition(positionAfterCommand);

        openIndicesBrowser();
      }
      if (
        currentWord.word === 'TS' &&
        tsStringPosition &&
        tsStringPosition.startLineNumber !== -1 &&
        tsStringPosition.startLineNumber === mousePosition.lineNumber &&
        currentWord.startColumn >= tsStringPosition.min &&
        currentWord.endColumn <= tsStringPosition.max
      ) {
        // Move cursor to position after "TS "
        const positionAfterCommand = new monaco.Position(
            tsStringPosition.startLineNumber,
            tsStringPosition.max + 1
          )
        editorRef.current?.setPosition(positionAfterCommand);
        editorRef.current?.revealPosition(positionAfterCommand);

        openIndicesBrowser();
      }
    },
    [editorModel, editorRef, query.esql]
  );

  const resourcesLabelKeyDownHandler = useCallback(
    (e: monaco.IKeyboardEvent) => {
      const currentPosition = editorRef.current?.getPosition();
      if (!currentPosition) return;
      const currentWord = editorModel.current?.getWordAtPosition(currentPosition);
      if (!currentWord) return;
      const fromStringPosition = findCommandStringPosition(query.esql, 'from');
      const tsStringPosition = findCommandStringPosition(query.esql, 'ts');
      // Open the popover on arrow down key press
      if (
        e.keyCode === monaco.KeyCode.DownArrow &&
        !resourcesOpenStatusRef.current &&
        currentWord.word === 'FROM' &&
        fromStringPosition &&
        fromStringPosition.startLineNumber !== -1 &&
        fromStringPosition.startLineNumber === currentPosition.lineNumber &&
        currentWord.startColumn >= fromStringPosition.min &&
        currentWord.endColumn <= fromStringPosition.max
      ) {
        e.preventDefault();
        // Move cursor to position after "FROM "
        const positionAfterFrom = new monaco.Position(
          fromStringPosition.startLineNumber,
          fromStringPosition.max + 1
        );
        editorRef.current?.setPosition(positionAfterFrom);
        editorRef.current?.revealPosition(positionAfterFrom);

        // Trigger autocomplete suggestions
        setTimeout(() => {
          editorRef.current?.trigger(undefined, 'editor.action.triggerSuggest', {});
        }, 0);
      }
      if (
        e.keyCode === monaco.KeyCode.DownArrow &&
        !resourcesOpenStatusRef.current &&
        currentWord.word === 'TS' &&
        tsStringPosition &&
        tsStringPosition.startLineNumber !== -1 &&
        tsStringPosition.startLineNumber === currentPosition.lineNumber &&
        currentWord.startColumn >= tsStringPosition.min &&
        currentWord.endColumn <= tsStringPosition.max
      ) {
        e.preventDefault();
        // Move cursor to position after "TS "
        const positionAfterTs = new monaco.Position(
          tsStringPosition.startLineNumber,
          tsStringPosition.max + 1
        );
        editorRef.current?.setPosition(positionAfterTs);
        editorRef.current?.revealPosition(positionAfterTs);

        // Trigger autocomplete suggestions
        setTimeout(() => {
          editorRef.current?.trigger(undefined, 'editor.action.triggerSuggest', {});
        }, 0);
      }
    },
    [editorModel, editorRef, query.esql]
  );

  return {
    addResourcesDecorator,
    resourcesBadgeStyle,
    resourcesLabelClickHandler,
    resourcesLabelKeyDownHandler,
  };
};
