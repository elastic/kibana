/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { monaco } from '@kbn/monaco';
import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import type { AggregateQuery } from '@kbn/es-query';
import { findCommandPositions } from './utils';

/**
 * Hook to register a custom command in the ESQL editor for creating a resources badge.
 * @param editorRef
 * @param editorModel
 * @param query
 */
export const useResourcesBadge = (
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>,
  editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>,
  query: AggregateQuery,
  openIndicesBrowser: () => void
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
    const commands = ['from', 'ts'];
    const collections: monaco.editor.IModelDeltaDecoration[] = [];

    commands.forEach((commandName) => {
      // Find all string positions for this command
      const commandPositions = findCommandPositions(query.esql, commandName);

      // Create decorations for all occurrences
      commandPositions.forEach((commandPosition) => {
        collections.push({
          range: new monaco.Range(
            commandPosition.lineNumber,
            commandPosition.startColumn,
            commandPosition.lineNumber,
            commandPosition.startColumn + commandName.length
          ),
          options: {
            isWholeLine: false,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            inlineClassName: resourcesFromBadgeClassName,
          },
        });
      });
    });

    if (collections.length > 0) {
      editorRef?.current?.createDecorationsCollection(collections);
    }
  }, [editorRef, query.esql, resourcesFromBadgeClassName]);

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
      const openIndexIndicesBrowserAtCommand = (commands: string[]) => {
        commands.forEach((command) => {
          if (currentWord.word === command) {
            const commandPositions = findCommandPositions(query.esql, command);
            // Check all occurrences to see if the click is on any of them
            for (const commandPosition of commandPositions) {
              if (
                commandPosition.lineNumber === mousePosition.lineNumber &&
                currentWord.startColumn >= commandPosition.startColumn &&
                currentWord.endColumn <= commandPosition.startColumn + command.length
              ) {
                const positionAfterCommand = new monaco.Position(
                  commandPosition.lineNumber,
                  commandPosition.startColumn + command.length + 1
                );
                editorRef.current?.setPosition(positionAfterCommand);
                editorRef.current?.revealPosition(positionAfterCommand);
                openIndicesBrowser();
                return; // Found matching command, no need to continue
              }
            }
          }
        });
      };

      openIndexIndicesBrowserAtCommand(['FROM', 'TS']);
    },
    [editorModel, editorRef, query.esql, openIndicesBrowser]
  );

  const resourcesLabelKeyDownHandler = useCallback(
    (e: monaco.IKeyboardEvent) => {
      const currentPosition = editorRef.current?.getPosition();
      if (!currentPosition) return;
      const currentWord = editorModel.current?.getWordAtPosition(currentPosition);
      if (!currentWord) return;

      // Trigger autocomplete suggestions if current word is a command
      const handleCommandKeyDown = (commands: string[]) => {
        commands.forEach((command) => {
          if (currentWord.word === command) {
            const commandPositions = findCommandPositions(query.esql, command);
            // Check all occurrences to see if the cursor is on any of them
            for (const commandPosition of commandPositions) {
              if (
                commandPosition.lineNumber === currentPosition.lineNumber &&
                currentWord.startColumn >= commandPosition.startColumn &&
                currentWord.endColumn <= commandPosition.startColumn + command.length
              ) {
                e.preventDefault();
                // Move cursor to position after command
                const positionAfterCommand = new monaco.Position(
                  commandPosition.lineNumber,
                  commandPosition.startColumn + command.length + 1
                );
                editorRef.current?.setPosition(positionAfterCommand);
                editorRef.current?.revealPosition(positionAfterCommand);

                // Trigger autocomplete suggestions
                setTimeout(() => {
                  editorRef.current?.trigger(undefined, 'editor.action.triggerSuggest', {});
                }, 0);
                return; // Found matching command, no need to continue
              }
            }
          }
        });
      };

      if (e.keyCode === monaco.KeyCode.DownArrow && !resourcesOpenStatusRef.current) {
        handleCommandKeyDown(['FROM', 'TS']);
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
