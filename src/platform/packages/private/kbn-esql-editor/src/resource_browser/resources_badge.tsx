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
import { Parser } from '@kbn/esql-language';
import type { AggregateQuery } from '@kbn/es-query';
import { findCommandStringPosition } from './utils';

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
    const { root } = Parser.parse(query.esql);
    const commands = ['from', 'ts'];
    const collections: monaco.editor.IModelDeltaDecoration[] = [];

    commands.forEach((commandName) => {
      const command = root.commands.find((cmd) => cmd.name === commandName);
      if (command) {
        const commandPosition = findCommandStringPosition(query.esql, commandName);
        if (commandPosition && commandPosition.startLineNumber !== -1) {
          collections.push({
            range: new monaco.Range(
              commandPosition.startLineNumber,
              commandPosition.min + 1,
              commandPosition.endLineNumber,
              commandPosition.max
            ),
            options: {
              isWholeLine: false,
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              inlineClassName: resourcesFromBadgeClassName,
            },
          });
        }
      }
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
          const commandPosition = findCommandStringPosition(query.esql, command.toLowerCase());
          if (
            currentWord.word === command &&
            commandPosition.startLineNumber !== -1 &&
            commandPosition.startLineNumber === mousePosition.lineNumber &&
            currentWord.startColumn >= commandPosition.min &&
            currentWord.endColumn <= commandPosition.max
          ) {
            const positionAfterCommand = new monaco.Position(
              commandPosition.startLineNumber,
              commandPosition.max + 1
            );
            editorRef.current?.setPosition(positionAfterCommand);
            editorRef.current?.revealPosition(positionAfterCommand);
            openIndicesBrowser();
            return; // No need to continue checking for other commands
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
          const commandPosition = findCommandStringPosition(query.esql, command.toLowerCase());
          if (
            currentWord.word === command &&
            commandPosition.startLineNumber !== -1 &&
            commandPosition.startLineNumber === currentPosition.lineNumber &&
            currentWord.startColumn >= commandPosition.min &&
            currentWord.endColumn <= commandPosition.max
          ) {
            e.preventDefault();
            // Move cursor to position after command
            const positionAfterCommand = new monaco.Position(
              commandPosition.startLineNumber,
              commandPosition.max + 1
            );
            editorRef.current?.setPosition(positionAfterCommand);
            editorRef.current?.revealPosition(positionAfterCommand);

            // Trigger autocomplete suggestions
            setTimeout(() => {
              editorRef.current?.trigger(undefined, 'editor.action.triggerSuggest', {});
            }, 0);
            return; // No need to continue checking for other commands
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
