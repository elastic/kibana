/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import { monaco } from '@kbn/monaco';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CommandBadgeWidget } from './command_badge_widget';

interface CommandPosition {
  command: 'FROM' | 'WHERE';
  position: monaco.Position;
  offset: number;
}

/**
 * Hook to add clickable badges on FROM and WHERE commands that trigger autocomplete suggestions
 */
export const useCommandBadges = (
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>,
  editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>,
  query: string,
  enableIndicesBrowser: boolean
) => {
  const { euiTheme } = useEuiTheme();
  const badgeWidgetsRef = useRef<CommandBadgeWidget[]>([]);

  const findCommandPositions = useCallback(
    async (text: string): Promise<CommandPosition[]> => {
      if (!editorModel.current) {
        return [];
      }

      try {
        // Dynamically import parse to avoid loading it if not needed
        const { parse } = await import('@kbn/esql-language/src/parser');
        const { root } = parse(text, { withFormatting: true });
        const positions: CommandPosition[] = [];

        // Find FROM command
        const fromCommand = root.commands.find((cmd) => cmd.name.toLowerCase() === 'from');
        if (fromCommand) {
          const fromPosition = editorModel.current.getPositionAt(fromCommand.location.min);
          if (fromPosition) {
            // Position badge after "FROM" keyword
            const fromKeywordLength = 4; // "FROM"
            const afterFromPosition = editorModel.current.getPositionAt(
              fromCommand.location.min + fromKeywordLength
            );
            if (afterFromPosition) {
              positions.push({
                command: 'FROM',
                position: afterFromPosition,
                offset: fromCommand.location.min + fromKeywordLength,
              });
            }
          }
        }

        // Find WHERE command
        const whereCommand = root.commands.find((cmd) => cmd.name.toLowerCase() === 'where');
        if (whereCommand) {
          const wherePosition = editorModel.current.getPositionAt(whereCommand.location.min);
          if (wherePosition) {
            // Position badge after "WHERE" keyword
            const whereKeywordLength = 5; // "WHERE"
            const afterWherePosition = editorModel.current.getPositionAt(
              whereCommand.location.min + whereKeywordLength
            );
            if (afterWherePosition) {
              positions.push({
                command: 'WHERE',
                position: afterWherePosition,
                offset: whereCommand.location.min + whereKeywordLength,
              });
            }
          }
        }

        return positions;
      } catch (error) {
        // If parsing fails, return empty array
        return [];
      }
    },
    [editorModel]
  );

  const triggerSuggestionsAtPosition = useCallback(
    (position: monaco.Position, offset: number) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      // Move cursor to the position after the command
      editor.setPosition(position);
      editor.revealPosition(position);

      // Trigger autocomplete suggestions
      setTimeout(() => {
        editor.trigger(undefined, 'editor.action.triggerSuggest', {});
      }, 0);
    },
    [editorRef]
  );

  useEffect(() => {
    if (!enableIndicesBrowser || !editorRef.current || !editorModel.current) {
      // Clean up existing badges
      badgeWidgetsRef.current.forEach((widget) => widget.dispose());
      badgeWidgetsRef.current = [];
      return;
    }

    let isCancelled = false;

    findCommandPositions(query).then((positions) => {
      if (isCancelled || !editorRef.current) {
        return;
      }

      // Remove old badges
      badgeWidgetsRef.current.forEach((widget) => widget.dispose());
      badgeWidgetsRef.current = [];

      // Create new badges using content widgets
      // Note: Content widgets are positioned absolutely, so we need to position them
      // right after the command keyword. We'll use the position after the command.
      positions.forEach(({ command, position, offset }) => {
        const label =
          command === 'FROM'
            ? i18n.translate('esqlEditor.commandBadge.browseIndices', {
                defaultMessage: 'Browse',
              })
            : i18n.translate('esqlEditor.commandBadge.browseFields', {
                defaultMessage: 'Browse',
              });

        const onClick = () => {
          triggerSuggestionsAtPosition(position, offset);
        };

        // Position the badge right after the command keyword
        // We need to adjust the column to be after the command word
        const badgePosition = new monaco.Position(position.lineNumber, position.column);

        const widget = new CommandBadgeWidget({
          label,
          position: badgePosition,
          onClick,
          euiTheme,
          editor: editorRef.current!,
        });

        badgeWidgetsRef.current.push(widget);
      });
    });

    // Cleanup on unmount
    return () => {
      isCancelled = true;
      badgeWidgetsRef.current.forEach((widget) => widget.dispose());
      badgeWidgetsRef.current = [];
    };
  }, [query, enableIndicesBrowser, editorRef, editorModel, euiTheme, findCommandPositions, triggerSuggestionsAtPosition]);
};

