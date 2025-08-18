/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import {
  getRecommendedQueriesTemplates,
  getCategorizationField,
} from '@kbn/esql-ast/src/commands_registry/options/recommended_queries';
import type { ESQLCallbacks } from '../shared/types';
import { getFieldsByTypeHelper } from '../shared/resources_helpers';

export interface InlineSuggestionItem {
  /**
   * The text to insert.
   * If the text contains a line break, the range must end at the end of a line.
   * If existing text should be replaced, the existing text must be a prefix of the text to insert.
   *
   * The text can also be a snippet. In that case, a preview with default parameters is shown.
   * When accepting the suggestion, the full snippet is inserted.
   */
  insertText:
    | string
    | {
        snippet: string;
      };
  /**
   * A text that is used to decide if this inline completion should be shown.
   * An inline completion is shown if the text to replace is a subword of the filter text.
   */
  filterText?: string;
  /**
   * The range to replace.
   * Must begin and end on the same line.
   */
  range?: {
    /**
     * Line number on which the range starts (starts at 1).
     */
    readonly startLineNumber: number;
    /**
     * Column on which the range starts in line `startLineNumber` (starts at 1).
     */
    readonly startColumn: number;
    /**
     * Line number on which the range ends.
     */
    readonly endLineNumber: number;
    /**
     * Column on which the range ends in line `endLineNumber`.
     */
    readonly endColumn: number;
  };
  /**
   * Suggestions can trigger a command by id. This is useful to trigger specific actions in some contexts
   */
  command?: {
    title: string;
    id: string;
  };
  /**
   * If set to `true`, unopened closing brackets are removed and unclosed opening brackets are closed.
   * Defaults to `false`.
   */
  completeBracketPairs?: boolean;
}

function processQuery(query: string): string {
  // Regex to remove C-style comments /* ... */
  const noComments = query.replace(/\/\*[\s\S]*?\*\//g, '');

  const noNewLines = noComments.replace(/[\n\r]/g, '');
  // Regex to normalize spacing around the '|' character to be exactly " | "
  return noNewLines.replace(/\s*\|\s*/g, ' | ').trim();
}

function filterByPrefix(
  arr: InlineSuggestionItem[],
  prefix: string,
  fullText: string
): InlineSuggestionItem[] {
  return arr.filter((item) => {
    if (typeof item.insertText === 'string') {
      const trimmedText = processQuery(item.insertText).toLowerCase();
      return (
        trimmedText.startsWith(prefix) &&
        trimmedText !== prefix &&
        processQuery(fullText).toLowerCase() !== trimmedText
      );
    } else if (typeof item.insertText === 'object' && 'snippet' in item.insertText) {
      const trimmedSnippet = processQuery(item.insertText.snippet).toLowerCase();
      return trimmedSnippet.startsWith(prefix) && trimmedSnippet !== prefix;
    }
    return false;
  });
}

export async function inlineSuggest(
  fullText: string,
  textBeforeCursor: string,
  range: InlineSuggestionItem['range'],
  callbacks?: ESQLCallbacks
): Promise<{ items: InlineSuggestionItem[] }> {
  const trimmedText = processQuery(textBeforeCursor).toLowerCase();

  let fromCommand = '';
  const dataSource = getIndexPatternFromESQLQuery(trimmedText);

  if (dataSource) {
    fromCommand = `FROM ${dataSource}`;
  } else {
    const sources = (await callbacks?.getSources?.()) || [];
    const visibleSources = sources.filter((source) => !source.hidden);
    if (visibleSources.find((source) => source.name.startsWith('logs'))) {
      fromCommand = 'FROM logs*';
    } else if (visibleSources.length) {
      fromCommand = `FROM ${visibleSources[0].name}`;
    }
  }

  const { getFieldsByType } = getFieldsByTypeHelper(fromCommand, callbacks);

  const [dateFields, textFields] = await Promise.all([
    getFieldsByType(['date'], []),
    // get text fields separately to avoid mixing them with date fields
    getFieldsByType(['text'], []),
  ]);

  let timeField = '';
  let categorizationField: string | undefined = '';

  if (dateFields.length) {
    timeField =
      dateFields?.find((field) => field.name === '@timestamp')?.name || dateFields[0].name;
  }

  if (textFields.length) {
    categorizationField = getCategorizationField(textFields.map((field) => field.name));
  }

  const editorExtensions = (await callbacks?.getEditorExtensions?.(fromCommand)) ?? {
    recommendedQueries: [],
  };

  const historyStarredItemsResult = await callbacks?.getHistoryStarredItems?.();
  const historyStarredItems = historyStarredItemsResult
    ? historyStarredItemsResult.map((item) => {
        return {
          insertText: item,
          range,
        };
      })
    : [];

  const queryItemsFromExtensions = editorExtensions.recommendedQueries.map((query) => {
    return {
      insertText: query.query,
      range,
    };
  });

  const recommendedQueries = getRecommendedQueriesTemplates({
    fromCommand,
    timeField,
    categorizationField,
  }).map((query) => {
    return {
      insertText: query.queryString,
      range,
    };
  });

  const allSuggestions = [
    ...queryItemsFromExtensions,
    ...recommendedQueries,
    ...historyStarredItems,
  ];

  // Remove duplicates based on insertText
  const inlineSuggestions = allSuggestions.filter((item, index, self) => {
    const currentText =
      typeof item.insertText === 'string'
        ? item.insertText
        : (item.insertText as { snippet: string }).snippet;

    return (
      index ===
      self.findIndex((otherItem) => {
        const otherText =
          typeof otherItem.insertText === 'string'
            ? otherItem.insertText
            : (otherItem.insertText as { snippet: string }).snippet;
        return processQuery(currentText).toLowerCase() === processQuery(otherText).toLowerCase();
      })
    );
  });

  return {
    items: filterByPrefix(inlineSuggestions, trimmedText, fullText).map((item) => {
      return {
        ...item,
        insertText:
          typeof item.insertText === 'string'
            ? processQuery(item.insertText).substring(trimmedText.length)
            : {
                snippet: processQuery(item.insertText.snippet).substring(trimmedText.length),
              },
      };
    }),
  };
}
