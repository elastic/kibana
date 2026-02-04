/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, useState } from 'react';
import type { monaco } from '@kbn/monaco';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { correctQuerySyntax } from '@kbn/esql-language/src/commands/definitions/utils/ast';
import {
  Parser,
  Builder,
  isSource,
  mutate,
  suggest,
  type ESQLAstItem,
  type ESQLAstQueryExpression,
} from '@kbn/esql-language';
import type { ESQLCommand, ESQLSource } from '@kbn/esql-language';
import { VerbatimPrettyPrinter } from '@kbn/esql-language/src/pretty_print';
import { getCursorContext } from '@kbn/esql-language/src/language/shared/get_cursor_context';
import { getQueryForFields } from '@kbn/esql-language/src/language/shared/get_query_for_fields';
import { getColumnsByTypeRetriever } from '@kbn/esql-language/src/language/shared/columns_retrieval_helpers';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { difference } from 'lodash';
import { BROWSER_POPOVER_WIDTH } from './browser_popover_wrapper';

interface SourcesRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

interface UseResourceBrowserProps {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>;
  esqlCallbacks: ESQLCallbacks;
}

interface BrowserPopoverPosition {
  top?: number;
  left?: number;
}

type SourceCommandName = 'from' | 'ts';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isQueryExpression(node: unknown): node is ESQLAstQueryExpression {
  return isObject(node) && node.type === 'query';
}

function isCommand(node: unknown): node is ESQLCommand {
  return isObject(node) && node.type === 'command';
}

function isParens(node: unknown): node is { type: 'parens'; child: unknown } {
  return isObject(node) && node.type === 'parens' && 'child' in node;
}

function walkAstItem(item: ESQLAstItem, visitor: (node: unknown) => void) {
  if (Array.isArray(item)) {
    item.forEach((child) => walkAstItem(child as unknown as ESQLAstItem, visitor));
    return;
  }

  visitor(item);

  // We only care about parentheses-wrapped query expressions for nesting.
  if (isParens(item) && isQueryExpression(item.child)) {
    walkQuery(item.child, visitor);
  }
}

function walkQuery(query: ESQLAstQueryExpression, visitor: (node: unknown) => void) {
  visitor(query);
  query.commands.forEach((cmd) => {
    visitor(cmd);
    if (isCommand(cmd)) {
      cmd.args.forEach((arg) => walkAstItem(arg as ESQLAstItem, visitor));
    }
  });
}

function collectSourceCommands(
  root: ESQLAstQueryExpression
): Array<ESQLCommand<SourceCommandName>> {
  const commands: Array<ESQLCommand<SourceCommandName>> = [];

  walkQuery(root, (node) => {
    if (!isCommand(node)) return;
    if (node.name === 'from' || node.name === 'ts') {
      commands.push(node as ESQLCommand<SourceCommandName>);
    }
  });

  return commands;
}

function collectAllCommands(root: ESQLAstQueryExpression): ESQLCommand[] {
  const commands: ESQLCommand[] = [];

  walkQuery(root, (node) => {
    if (!isCommand(node)) return;
    commands.push(node);
  });

  return commands;
}

function pickClosestCommand<T extends { location: { min: number; max: number } }>(
  commands: T[],
  offset: number
): T | undefined {
  let best: T | undefined;
  let bestStartDistance = Number.POSITIVE_INFINITY;
  let bestSpan = Number.POSITIVE_INFINITY;

  for (const cmd of commands) {
    const { min, max } = cmd.location;
    // Only consider commands that start at/before the cursor.
    if (min > offset) continue;

    // Pick the command whose start is closest to the cursor (from the left).
    const startDistance = offset - min;
    const span = max - min;

    // Prefer:
    // - the command that starts closest to the cursor
    // - then more specific command (smaller span) for nested FROM clauses
    if (
      startDistance < bestStartDistance ||
      (startDistance === bestStartDistance && span < bestSpan)
    ) {
      best = cmd;
      bestStartDistance = startDistance;
      bestSpan = span;
    }
  }

  return best;
}

function collectIndexSourcesFromSourceCommand(command: ESQLCommand): ESQLSource[] {
  // Only collect the *direct* sources of the given FROM/TS command.
  // Do not descend into subqueries (e.g. `FROM (FROM other | ...)`) since those
  // have their own independent source lists.
  return command.args.filter((arg): arg is ESQLSource => {
    return isSource(arg) && arg.sourceType === 'index';
  });
}

export function useResourceBrowser({
  editorRef,
  editorModel,
  esqlCallbacks,
}: UseResourceBrowserProps) {
  const [isDataSourceBrowserOpen, setIsDataSourceBrowserOpen] = useState(false);
  const [isFieldsBrowserOpen, setIsFieldsBrowserOpen] = useState(false);
  const fieldsBrowserGetColumnMapRef = useRef<(() => Promise<Map<string, any>>) | undefined>(
    undefined
  );
  const [browserPopoverPosition, setBrowserPopoverPosition] = useState<BrowserPopoverPosition>({});
  const browserCursorPositionRef = useRef<monaco.Position | null>(null);
  const fieldsBrowserQueryStringRef = useRef<string>('');
  // Store the suggested field names from autocomplete to filter the fields browser display
  const suggestedFieldNamesRef = useRef<Set<string>>(new Set());
  // Track whether the current command is a TS command to filter timeseries indices
  const isTSCommandRef = useRef<boolean>(false);
  // Track the sources currently in the query for pre-selection
  const sourcesInQueryRef = useRef<string[]>([]);
  // Track the range in the editor where sources are located for replacement
  const sourcesRangeRef = useRef<SourcesRange | null>(null);

  const handleDataSourceBrowserSelect = useCallback(
    (newSourceNames: string[]) => {
      const editor = editorRef.current;
      const model = editorModel.current;
      if (!editor || !model) return;

      const fullText = model.getValue() || '';
      const cursorPosition = browserCursorPositionRef.current ?? editor.getPosition();
      if (!cursorPosition) return;

      try {
        const cursorOffset = model.getOffsetAt(cursorPosition) || 0;

        const result = Parser.parse(fullText, { withFormatting: true });

        // Pick the FROM/TS command closest to the cursor in the *full* query.
        const sourceCommands = collectSourceCommands(result.root);
        const activeSourceCommand = pickClosestCommand(sourceCommands, cursorOffset);
        if (!activeSourceCommand) return;

        const trimmedSources = newSourceNames.map((s) => s.trim()).filter((s) => s.length > 0);
        const newSourcesText = trimmedSources.join(', ');
        const existingDirectIndexSources =
          collectIndexSourcesFromSourceCommand(activeSourceCommand);
        const newSources = difference(
          trimmedSources,
          existingDirectIndexSources.map((src: ESQLSource) => src.text)
        );

        console.log('newSources', newSources);
        // Add any newly selected sources via the ES|QL mutation API.
        for (const sourceName of newSources) {
          const [maybeCluster, maybeIndex] = sourceName.split(':', 2);
          const newSource =
            maybeIndex && maybeCluster
              ? Builder.expression.source.index(maybeIndex, maybeCluster)
              : Builder.expression.source.index(sourceName);
          mutate.generic.commands.args.insert(activeSourceCommand, newSource);
          mutate.commands.from.sources.upsert(result.root, sourceName);
        }

        // Print the full query exactly as typed (spaces/tabs/newlines/comments),
        // then do a minimal substring replacement for the selected sources.
        const baseText = VerbatimPrettyPrinter.print(result.tokens, { src: fullText });
        console.log('baseText', baseText);
        const baseStartOffset = result.root.location?.min ?? 0;

        const updatedQuery = (() => {
          if (existingDirectIndexSources.length === 0) {
            // Fallback: if we can't find sources in the active command, use the range computed
            // when opening the data source browser (if present).
            if (!sourcesRangeRef.current) return baseText;

            const range = sourcesRangeRef.current;
            const startOffset = model.getOffsetAt({
              lineNumber: range.startLineNumber,
              column: range.startColumn,
            });
            const endOffset = model.getOffsetAt({
              lineNumber: range.endLineNumber,
              column: range.endColumn,
            });

            const start = Math.max(0, startOffset - baseStartOffset);
            const endExclusive = Math.max(0, endOffset - baseStartOffset);
            return baseText.slice(0, start) + newSourcesText + baseText.slice(endExclusive);
          }

          const first = existingDirectIndexSources[0];
          const last = existingDirectIndexSources[existingDirectIndexSources.length - 1];
          const start = Math.max(0, first.location.min - baseStartOffset);
          const endExclusive = Math.max(0, last.location.max + 1 - baseStartOffset);

          return baseText.slice(0, start) + newSourcesText + baseText.slice(endExclusive);
        })();

        editor.executeEdits('dataSourceBrowser', [
          {
            range: model.getFullModelRange(),
            text: updatedQuery,
          },
        ]);

        // Keep pre-selection in sync for subsequent openings.
        sourcesInQueryRef.current = trimmedSources;
      } catch {
        // If parsing fails for any reason, fall back to the previous range-replacement behavior.
        if (!sourcesRangeRef.current) return;
        const range = sourcesRangeRef.current;
        const newText = newSourceNames.join(', ');
        editor.executeEdits('dataSourceBrowser', [{ range, text: newText }]);
        sourcesRangeRef.current = { ...range, endColumn: range.startColumn + newText.length };
      }
    },
    [editorRef, editorModel]
  );

  const handleResourceBrowserSelect = useCallback(
    (newResourceNames: string, oldLength: number) => {
      if (editorRef.current && editorModel.current && browserCursorPositionRef.current) {
        const initialCursorPosition = browserCursorPositionRef.current;
        const textAfterInitialCursor = editorModel.current
          .getValue()
          .substring(initialCursorPosition.column);
        // Check if there is a resource after the initial cursor - match any whitespace or newline followed by a letter or dot
        const hasExistingResourceAfterInitialCursor =
          textAfterInitialCursor.match(/^[\s\n]*[a-zA-Z.].*/);

        const range = {
          startLineNumber: initialCursorPosition.lineNumber,
          startColumn: initialCursorPosition.column,
          endLineNumber: initialCursorPosition.lineNumber,
          endColumn:
            initialCursorPosition.column +
            oldLength +
            (oldLength > 0 && newResourceNames.length === 0 && hasExistingResourceAfterInitialCursor
              ? 1
              : 0), // Delete comma if all resources are deleted and there was some inserted resource before
        };
        editorRef.current.executeEdits('indicesBrowser', [
          {
            range,
            text:
              newResourceNames +
              (oldLength === 0 &&
              newResourceNames.length > 0 &&
              hasExistingResourceAfterInitialCursor
                ? ','
                : ''), // Add comma if there is initially an existing resource and there is currently no inserted resource
          },
        ]);
      }
    },
    [editorRef, editorModel]
  );

  const updateResourceBrowserPosition = useCallback(() => {
    if (editorRef.current) {
      const cursorPosition = editorRef.current.getPosition();
      if (cursorPosition) {
        // Save the cursor position for use in handleIndexSelect
        browserCursorPositionRef.current = cursorPosition;

        const editorCoords = editorRef.current.getDomNode()?.getBoundingClientRect();
        const editorPosition = editorRef.current.getScrolledVisiblePosition(cursorPosition);
        if (editorCoords && editorPosition) {
          const editorTop = editorCoords.top;
          const editorLeft = editorCoords.left;
          // Calculate the absolute position of the popover
          const absoluteTop = editorTop + (editorPosition?.top ?? 0) - 120;
          let absoluteLeft = editorLeft + (editorPosition?.left ?? 0);
          if (absoluteLeft > editorCoords.width) {
            // date picker is out of the editor
            absoluteLeft = absoluteLeft - BROWSER_POPOVER_WIDTH;
          }

          setBrowserPopoverPosition({ top: absoluteTop, left: absoluteLeft });
        }
      }
    }
  }, [editorRef]);

  const openIndicesBrowser = useCallback(async () => {
    if (editorRef.current && editorModel.current) {
      const position = editorRef.current.getPosition();
      if (position) {
        const fullText = editorModel.current.getValue() || '';
        const offset = editorModel.current.getOffsetAt(position) || 0;
        const innerText = fullText.substring(0, offset);
        const correctedQuery = correctQuerySyntax(innerText);
        const parseResult = Parser.parse(correctedQuery, { withFormatting: true });
        const fullTextParseResult = Parser.parse(fullText, { withFormatting: true });
        const { root } = parseResult;
        const fullRoot = fullTextParseResult.root;

        // Use the full-text AST to locate all FROM/TS source commands and select the one
        // closest to the cursor offset (inside or nearest).
        const sourceCommands = collectSourceCommands(fullRoot);
        const activeSourceCommand = pickClosestCommand(sourceCommands, offset);

        // Fallback: keep the previous cursor-context behavior for TS detection if parsing is incomplete.
        const astContext = getCursorContext(innerText, root, offset);
        const isTS = (activeSourceCommand?.name ?? astContext.command?.name) === 'ts';
        isTSCommandRef.current = isTS;

        const sourcesInActiveCommand = activeSourceCommand
          ? collectIndexSourcesFromSourceCommand(activeSourceCommand)
          : [];

        if (sourcesInActiveCommand.length > 0) {
          sourcesInQueryRef.current = sourcesInActiveCommand.map((s) => s.name);

          const startOffset = sourcesInActiveCommand[0].location.min;
          const endOffsetExclusive =
            sourcesInActiveCommand[sourcesInActiveCommand.length - 1].location.max + 1;

          const startPos = editorModel.current.getPositionAt(startOffset);
          const endPos = editorModel.current.getPositionAt(endOffsetExclusive);

          sourcesRangeRef.current = {
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
          };
        } else {
          // Last-resort fallback for pre-selection and replacement range when we can't find a source command.
          const sourceFromUpdatedQuery = getIndexPatternFromESQLQuery(fullText);
          const sourcesInQuery = sourceFromUpdatedQuery ? sourceFromUpdatedQuery.split(',') : [];
          sourcesInQueryRef.current = sourcesInQuery;

          sourcesRangeRef.current = {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          };
        }
      }
    }
    updateResourceBrowserPosition();
    setIsDataSourceBrowserOpen(true);
  }, [updateResourceBrowserPosition, editorRef, editorModel]);

  const openFieldsBrowser = useCallback(async () => {
    if (editorRef.current && editorModel.current) {
      const position = editorRef.current.getPosition();
      if (position) {
        // Use the same logic as autocomplete to get fields
        const fullText = editorModel.current.getValue() || '';
        const offset = editorModel.current.getOffsetAt(position) || 0;
        const innerText = fullText.substring(0, offset);

        // editorRef.current.
        // Store the query string for fetching recommended fields
        fieldsBrowserQueryStringRef.current = innerText;
        const correctedQuery = correctQuerySyntax(innerText);
        const { root } = Parser.parse(correctedQuery, { withFormatting: true });
        const { root: fullRoot } = Parser.parse(fullText, { withFormatting: true });

        // Find the command preceding the cursor position in the *full* query.
        // This is useful in cases where the cursor is inside a subquery, or when the query
        // contains constructs after the cursor which would otherwise affect context.
        const precedingCommand = pickClosestCommand(collectAllCommands(fullRoot), offset);

        const astContext = getCursorContext(innerText, root, offset);
        const astForFields = astContext.astForContext;
        // Track whether the command context is TS to support timeseries-specific filtering elsewhere.
        isTSCommandRef.current = (precedingCommand?.name ?? astContext.command?.name) === 'ts';

        const { getColumnMap } = getColumnsByTypeRetriever(
          getQueryForFields(correctedQuery, astForFields),
          innerText,
          esqlCallbacks
        );

        // Call suggest() to get the same field suggestions as autocomplete
        // This ensures the fields browser shows only the contextually relevant fields
        const suggestions = await suggest(fullText, offset, esqlCallbacks);
        // Extract field names from suggestions (fields have kind: 'Variable')
        const fieldNames = new Set(
          suggestions.filter((s) => s.category === 'field').map((s) => s.label)
        );
        suggestedFieldNamesRef.current = fieldNames;

        // Store the getColumnMap function in a ref so it can be used by the popup
        fieldsBrowserGetColumnMapRef.current = getColumnMap;
      }
    }
    updateResourceBrowserPosition();
    setIsFieldsBrowserOpen(true);
  }, [esqlCallbacks, updateResourceBrowserPosition, editorRef, editorModel]);

  return {
    isDataSourceBrowserOpen,
    setIsDataSourceBrowserOpen,
    isFieldsBrowserOpen,
    setIsFieldsBrowserOpen,
    browserPopoverPosition,
    fieldsBrowserGetColumnMapRef,
    fieldsBrowserQueryStringRef,
    suggestedFieldNamesRef,
    isTSCommandRef,
    sourcesInQueryRef,
    handleResourceBrowserSelect,
    handleDataSourceBrowserSelect,
    openIndicesBrowser,
    openFieldsBrowser,
  };
}
