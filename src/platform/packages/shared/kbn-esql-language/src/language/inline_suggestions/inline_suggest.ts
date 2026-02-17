/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCallbacks } from '@kbn/esql-types';
import { EsqlQuery } from '../../composer';
import { type ESQLSource } from '../../types';
import {
  getRecommendedQueriesTemplates,
  getTimeAndCategorizationFields,
} from '../../commands/registry/options/recommended_queries';
import { getColumnsByTypeRetriever } from '../shared/columns_retrieval_helpers';
import { getFromCommandHelper } from '../shared/resources_helpers';
import type { InlineSuggestionItem } from './types';
import { fromCache, setToCache } from './inline_suggestions_cache';

const FALLBACK_FROM_COMMAND = 'FROM *';

function getSourceFromQuery(esql?: string) {
  const queryExpression = EsqlQuery.fromSrc(esql || '').ast;
  const sourceCommand = queryExpression.commands.find(({ name }) => ['from', 'ts'].includes(name));
  const args = (sourceCommand?.args ?? []) as ESQLSource[];
  const indices = args.filter((arg) => arg.sourceType === 'index');
  return indices?.map((index) => index.name).join(',');
}

/**
 * Normalizes query text by removing comments and newlines
 */
function processQuery(query: string): string {
  return query
    .replace(/\/\*[^*]*(?:\*(?!\/)[^*]*)*\*\//g, '') // Remove block comments (/* */)
    .replace(/\/\/.*$/gm, '') // Remove line comments (//)
    .replace(/[\n\r]/g, ' ') // Remove newlines
    .replace(/\s*\|\s*/g, ' | ') // Normalize pipe spacing
    .trim();
}

/**
 * Removes duplicate suggestions
 */
function removeDuplicates(suggestions: InlineSuggestionItem[]): InlineSuggestionItem[] {
  const seenKeys = new Set<string>();
  return suggestions.filter((item) => {
    const key = processQuery(item.insertText).toLowerCase();
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
    const normalizedText = processQuery(item.insertText).toLowerCase();
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
  return {
    ...item,
    insertText: processQuery(item.insertText).substring(prefixLength),
  };
}

/**
 * Fetches data sources and determines the FROM command
 */
async function getFromCommand(
  textBeforeCursor: string,
  callbacks?: ESQLCallbacks
): Promise<string> {
  // First, try to extract data source from the existing query
  const dataSource = getSourceFromQuery(textBeforeCursor);
  if (dataSource) {
    return `FROM ${dataSource}`;
  }

  const suggestedFromCommand = await getFromCommandHelper(callbacks);
  return suggestedFromCommand || FALLBACK_FROM_COMMAND;
}

/**
 * Fetches extension-based suggestions
 */
async function getExtensionSuggestions(
  fromCommand: string,
  range: InlineSuggestionItem['range'],
  callbacks?: ESQLCallbacks
): Promise<InlineSuggestionItem[]> {
  const editorExtensions = await callbacks
    ?.getEditorExtensions?.(fromCommand)
    .then((result) => result ?? { recommendedQueries: [] });

  return (editorExtensions?.recommendedQueries || []).map((query) => ({
    insertText: query.query,
    range,
  }));
}

/**
 * Fetches history-based suggestions
 */
async function getHistorySuggestions(
  range: InlineSuggestionItem['range'],
  callbacks?: ESQLCallbacks
): Promise<InlineSuggestionItem[]> {
  const historyStarredItems = await callbacks
    ?.getHistoryStarredItems?.()
    .then((result) => result ?? []);

  return (historyStarredItems || []).map((item) => ({
    insertText: item,
    range,
  }));
}

/**
 * Gets template-based suggestions with caching
 */
function getCachedRecommendedTemplateSuggestions(
  fromCommand: string,
  timeField: string,
  categorizationField: string | undefined,
  range: InlineSuggestionItem['range']
): InlineSuggestionItem[] {
  const cacheKey = `${fromCommand}:${timeField}:${categorizationField}`;
  const cached = fromCache<InlineSuggestionItem[]>(cacheKey);
  if (cached) {
    // Update range for cached results since range can change
    return cached.map((item) => ({ ...item, range }));
  }

  const suggestions = getRecommendedQueriesTemplates({
    fromCommand,
    timeField,
    categorizationField,
  }).map((query) => ({
    insertText: query.queryString,
    range,
  }));

  // Cache the templates
  setToCache(cacheKey, suggestions);
  return suggestions;
}

/**
 * Fetches all suggestion sources
 */
async function fetchAllSuggestions(
  fromCommand: string,
  timeField: string,
  categorizationField: string | undefined,
  range: InlineSuggestionItem['range'],
  callbacks?: ESQLCallbacks
): Promise<InlineSuggestionItem[]> {
  const [extensionSuggestions, historySuggestions] = await Promise.all([
    getExtensionSuggestions(fromCommand, range, callbacks),
    getHistorySuggestions(range, callbacks),
  ]);

  const templateSuggestions = getCachedRecommendedTemplateSuggestions(
    fromCommand,
    timeField,
    categorizationField,
    range
  );

  return [...extensionSuggestions, ...templateSuggestions, ...historySuggestions];
}

/**
 * Gets field information with caching
 */
async function getCachedTimeAndCategorizationFields(
  fromCommand: string,
  callbacks?: ESQLCallbacks
): Promise<{ timeField: string; categorizationField: string | undefined }> {
  const cacheKey = `${fromCommand}`;
  const cached = fromCache<{ timeField: string; categorizationField: string | undefined }>(
    cacheKey
  );

  if (cached) {
    return cached;
  }

  const { getColumnsByType } = getColumnsByTypeRetriever(
    EsqlQuery.fromSrc(fromCommand).ast,
    fromCommand,
    callbacks
  );

  const fieldInfo = await getTimeAndCategorizationFields(getColumnsByType);

  // Cache the field information
  setToCache(cacheKey, fieldInfo);
  return fieldInfo;
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

    // Important for recommended queries
    const fromCommand = await getFromCommand(trimmedText, callbacks);
    const { timeField, categorizationField } = await getCachedTimeAndCategorizationFields(
      fromCommand,
      callbacks
    );

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
    return { items: [] };
  }
}
