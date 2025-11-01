/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { EsqlQuery } from '@kbn/esql-ast';
import {
  getRecommendedQueriesTemplates,
  getCategorizationField,
} from '@kbn/esql-ast/src/commands_registry/options/recommended_queries';
import type { ESQLCallbacks } from '../shared/types';
import { getColumnsByTypeRetriever } from '../autocomplete/autocomplete';

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

/**
 * Normalizes query text by removing comments, newlines and standardizing pipe operators
 */
function processQuery(query: string): string {
  return query
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove C-style comments
    .replace(/[\n\r]/g, '') // Remove newlines
    .replace(/\s*\|\s*/g, ' | ') // Normalize pipe spacing
    .trim();
}

/**
 * Extracts the insert text content from an InlineSuggestionItem
 */
function getInsertTextContent(item: InlineSuggestionItem): string {
  return typeof item.insertText === 'string' ? item.insertText : item.insertText.snippet;
}

/**
 * Creates a normalized key for deduplication based on the insert text
 */
function createDeduplicationKey(item: InlineSuggestionItem): string {
  return processQuery(getInsertTextContent(item)).toLowerCase();
}

/**
 * Removes duplicate suggestions using a Set for O(n) performance
 */
function removeDuplicates(suggestions: InlineSuggestionItem[]): InlineSuggestionItem[] {
  const seenKeys = new Set<string>();
  return suggestions.filter((item) => {
    const key = createDeduplicationKey(item);
    if (seenKeys.has(key)) {
      return false;
    }
    seenKeys.add(key);
    return true;
  });
}

/**
 * Filters suggestions by prefix and ensures they're different from the current text
 */
function filterByPrefix(
  suggestions: InlineSuggestionItem[],
  prefix: string,
  fullText: string
): InlineSuggestionItem[] {
  const normalizedFullText = processQuery(fullText).toLowerCase();

  return suggestions.filter((item) => {
    const normalizedText = createDeduplicationKey(item);
    return (
      normalizedText.startsWith(prefix) &&
      normalizedText !== prefix &&
      normalizedText !== normalizedFullText
    );
  });
}

/**
 * Trims the prefix from the insert text to show only the completion part
 */
function trimSuggestionPrefix(
  item: InlineSuggestionItem,
  prefixLength: number
): InlineSuggestionItem {
  if (typeof item.insertText === 'string') {
    return {
      ...item,
      insertText: processQuery(item.insertText).substring(prefixLength),
    };
  }

  return {
    ...item,
    insertText: {
      snippet: processQuery(item.insertText.snippet).substring(prefixLength),
    },
  };
}

/**
 * Fetches data sources and determines the FROM command
 */
async function getFromCommand(
  textBeforeCursor: string,
  callbacks?: ESQLCallbacks
): Promise<string> {
  const dataSource = getIndexPatternFromESQLQuery(textBeforeCursor);

  if (dataSource) {
    return `FROM ${dataSource}`;
  }

  const sources = (await callbacks?.getSources?.()) || [];
  const visibleSources = sources.filter((source) => !source.hidden);

  if (visibleSources.find((source) => source.name.startsWith('logs'))) {
    return 'FROM logs*';
  }

  if (visibleSources.length > 0) {
    return `FROM ${visibleSources[0].name}`;
  }

  return 'FROM *';
}

/**
 * Fetches field information and determines time and categorization fields
 */
async function getFieldInfo(
  fromCommand: string,
  callbacks?: ESQLCallbacks
): Promise<{ timeField: string; categorizationField: string | undefined }> {
  const { getColumnsByType } = getColumnsByTypeRetriever(
    EsqlQuery.fromSrc(fromCommand).ast,
    fromCommand,
    callbacks
  );

  const [dateFields, textFields] = await Promise.all([
    getColumnsByType(['date'], []),
    getColumnsByType(['text'], []),
  ]);

  const timeField =
    dateFields.length > 0
      ? dateFields.find((field) => field.text === '@timestamp')?.text || dateFields[0].text
      : '';

  const categorizationField =
    textFields.length > 0
      ? getCategorizationField(textFields.map((field) => field.text))
      : undefined;

  return { timeField, categorizationField };
}

/**
 * Fetches all suggestion sources with conditional LLM handling
 */
async function fetchAllSuggestions(
  fromCommand: string,
  timeField: string,
  categorizationField: string | undefined,
  range: InlineSuggestionItem['range'],
  callbacks?: ESQLCallbacks
): Promise<InlineSuggestionItem[]> {
  const [editorExtensions, historyStarredItems] = await Promise.all([
    callbacks
      ?.getEditorExtensions?.(fromCommand)
      .then((result) => result ?? { recommendedQueries: [] }),
    callbacks?.getHistoryStarredItems?.().then((result) => result ?? []),
  ]);

  // Convert fast sources to InlineSuggestionItem format
  const extensionSuggestions = (editorExtensions?.recommendedQueries || []).map((query) => ({
    insertText: query.query,
    range,
  }));

  const historySuggestions = (historyStarredItems || []).map((item) => ({
    insertText: item,
    range,
  }));

  const templateSuggestions = getRecommendedQueriesTemplates({
    fromCommand,
    timeField,
    categorizationField,
  }).map((query) => ({
    insertText: query.queryString,
    range,
  }));

  const baseSuggestions = [...extensionSuggestions, ...templateSuggestions, ...historySuggestions];
  return baseSuggestions;
}

export async function inlineSuggest(
  fullText: string,
  textBeforeCursor: string,
  range: InlineSuggestionItem['range'],
  callbacks?: ESQLCallbacks
): Promise<{ items: InlineSuggestionItem[] }> {
  try {
    const trimmedText = processQuery(textBeforeCursor).toLowerCase();
    const trimmedFullText = processQuery(fullText).toLowerCase();

    if (trimmedText !== trimmedFullText) {
      // Don't show suggestions if cursor is not at the end of the query
      return { items: [] };
    }

    // Fetch data sources and field information
    const fromCommand = await getFromCommand(trimmedText, callbacks);
    const { timeField, categorizationField } = await getFieldInfo(fromCommand, callbacks);

    // Fetch all suggestions
    const allSuggestions = await fetchAllSuggestions(
      fromCommand,
      timeField,
      categorizationField,
      range,
      callbacks
    );

    // Process suggestions: remove duplicates, filter by prefix, and trim prefix
    const uniqueSuggestions = removeDuplicates(allSuggestions);
    const filteredSuggestions = filterByPrefix(uniqueSuggestions, trimmedText, fullText);
    const finalSuggestions = filteredSuggestions.map((item) =>
      trimSuggestionPrefix(item, trimmedText.length)
    );

    return { items: finalSuggestions };
  } catch (error) {
    // Return empty array on error to maintain user experience
    return { items: [] };
  }
}
