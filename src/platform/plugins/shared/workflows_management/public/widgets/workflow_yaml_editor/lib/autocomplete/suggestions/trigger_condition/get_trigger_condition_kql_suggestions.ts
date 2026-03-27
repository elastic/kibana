/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { isScalar } from 'yaml';
import type { QuerySuggestion } from '@kbn/kql/public';
import { QuerySuggestionTypes } from '@kbn/kql/public';
import { monaco } from '@kbn/monaco';
import { mergeTriggerEventSchemaValueSuggestions } from './event_schema_kql_value_suggestions';
import { getOrCreateStubDataViewForTriggerEventSchema } from './event_schema_to_stub_data_view';
import type { ExtendedAutocompleteContext } from '../../context/autocomplete.types';
import { getTriggerConditionBlockIndex } from '../../context/triggers_utils';
import type { WorkflowKqlCompletionServices } from '../workflow_kql_completion_services';

const KUERY_LANGUAGE = 'kuery';

export function getTriggerConditionKqlSpan(
  yamlDocument: Document,
  path: (string | number)[],
  documentText: string
): { kql: string; contentStartInFile: number; contentEndInFile: number } | null {
  if (getTriggerConditionBlockIndex(path) === null) {
    return null;
  }

  const node = yamlDocument.getIn(path, true);
  if (!isScalar(node) || node.range == null) {
    return null;
  }

  const range = node.range;
  const [r0, , r2] = range;
  const sourceSlice = documentText.slice(r0, r2);
  const parsed = node.value;
  const kqlParsed = typeof parsed === 'string' ? parsed : parsed != null ? String(parsed) : '';

  const leadingNonValue = sourceSlice.length - sourceSlice.trimStart().length;
  let contentStart = r0 + leadingNonValue;
  let contentEnd = r2 - (sourceSlice.length - sourceSlice.trimEnd().length);

  const trimmedLeft = sourceSlice.trimStart();
  let closingQuoteBalanced = true;
  if (trimmedLeft.startsWith("'")) {
    const rel = sourceSlice.indexOf("'");
    contentStart = r0 + rel + 1;
    const last = sourceSlice.lastIndexOf("'");
    if (last > rel) {
      contentEnd = r0 + last;
    }
    closingQuoteBalanced = last > rel;
  } else if (trimmedLeft.startsWith('"')) {
    const rel = sourceSlice.indexOf('"');
    contentStart = r0 + rel + 1;
    const last = sourceSlice.lastIndexOf('"');
    if (last > rel) {
      contentEnd = r0 + last;
    }
    closingQuoteBalanced = last > rel;
  }

  const kqlFromEditor =
    contentEnd > contentStart &&
    closingQuoteBalanced &&
    contentStart <= documentText.length &&
    contentEnd <= documentText.length
      ? documentText.slice(contentStart, contentEnd)
      : '';
  const kql = kqlFromEditor.length > 0 ? kqlFromEditor : kqlParsed;

  return { kql, contentStartInFile: contentStart, contentEndInFile: contentEnd };
}

function querySuggestionToMonacoKind(
  suggestion: QuerySuggestion
): monaco.languages.CompletionItemKind {
  const kind = monaco.languages.CompletionItemKind;
  switch (suggestion.type) {
    case QuerySuggestionTypes.Field:
      return kind.Field;
    case QuerySuggestionTypes.Value:
      return kind.Value;
    case QuerySuggestionTypes.Operator:
      return kind.Operator;
    case QuerySuggestionTypes.Conjunction:
      return kind.Keyword;
    default:
      return kind.Text;
  }
}

function trimTrailingSpaceFromKqlInsertText(text: string): string {
  return text.trimEnd();
}

export function resolveKqlSelectionAfterFieldColon(
  kql: string,
  selectionStart: number,
  selectionEnd: number
): { selectionStart: number; selectionEnd: number } {
  const start = Math.max(0, Math.min(kql.length, selectionStart));
  const end = Math.max(0, Math.min(kql.length, selectionEnd));
  if (start !== end) {
    return { selectionStart: start, selectionEnd: end };
  }
  if (start >= kql.length || kql[start] !== ':') {
    return { selectionStart: start, selectionEnd: end };
  }
  const afterColon = kql.slice(start + 1);
  if (/[^\s]/u.test(afterColon)) {
    return { selectionStart: start, selectionEnd: end };
  }
  const afterColonOffset = start + 1;
  return { selectionStart: afterColonOffset, selectionEnd: afterColonOffset };
}

export function buildKqlMonacoFilterText(
  kql: string,
  kqlSelectionStart: number,
  insertText: string
): string {
  const kqlPrefix = kql.slice(0, Math.max(0, Math.min(kqlSelectionStart, kql.length)));
  return `${kqlPrefix}${insertText}`;
}

export function isKqlMonacoSuggestionRangeValid(
  modelMaxOffset: number,
  contentStartInFile: number,
  suggestion: Pick<QuerySuggestion, 'start' | 'end'>
): boolean {
  const startOffset = contentStartInFile + suggestion.start;
  const endOffset = contentStartInFile + suggestion.end;
  return startOffset >= 0 && endOffset >= startOffset && startOffset <= modelMaxOffset;
}

export function mapQuerySuggestionsToMonaco(
  suggestions: QuerySuggestion[],
  model: monaco.editor.ITextModel,
  contentStartInFile: number,
  kql: string,
  kqlSelectionStart: number
): monaco.languages.CompletionItem[] {
  const maxOffset = model.getValueLength();
  const items: monaco.languages.CompletionItem[] = [];

  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i];
    if (isKqlMonacoSuggestionRangeValid(maxOffset, contentStartInFile, s)) {
      const startOffset = contentStartInFile + s.start;
      const endOffset = contentStartInFile + s.end;
      const safeEnd = Math.min(endOffset, maxOffset);
      const startPos = model.getPositionAt(startOffset);
      const endPos = model.getPositionAt(safeEnd);
      const rawText = typeof s.text === 'string' ? s.text : String(s.text);
      const insertText = trimTrailingSpaceFromKqlInsertText(rawText);
      const label = insertText.trim() || insertText || 'suggestion';
      const filterText = buildKqlMonacoFilterText(kql, kqlSelectionStart, insertText);

      items.push({
        label,
        kind: querySuggestionToMonacoKind(s),
        insertText,
        filterText,
        range: {
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column,
        },
        sortText: String(i).padStart(4, '0'),
        ...(typeof s.description === 'string' ? { documentation: { value: s.description } } : {}),
      });
    }
  }

  return items;
}

export async function getTriggerConditionKqlSuggestions(
  ctx: ExtendedAutocompleteContext,
  services: WorkflowKqlCompletionServices
): Promise<monaco.languages.CompletionItem[]> {
  const def = ctx.triggerConditionDefinition;
  if (!def) {
    return [];
  }

  const span = getTriggerConditionKqlSpan(ctx.yamlDocument, ctx.path, ctx.model.getValue());
  if (!span) {
    return [];
  }

  const { kql, contentStartInFile } = span;
  const { autocomplete } = services.kql;
  if (!autocomplete.hasQuerySuggestions(KUERY_LANGUAGE)) {
    return [];
  }

  const selectionInKql = ctx.absoluteOffset - contentStartInFile;
  const rawStart = Math.max(0, Math.min(kql.length, selectionInKql));
  const { selectionStart, selectionEnd } = resolveKqlSelectionAfterFieldColon(
    kql,
    rawStart,
    rawStart
  );

  const stub = getOrCreateStubDataViewForTriggerEventSchema(def.eventSchema, services.fieldFormats);

  let querySuggestions: QuerySuggestion[] = [];
  try {
    const batch = await autocomplete.getQuerySuggestions({
      language: KUERY_LANGUAGE,
      indexPatterns: [stub],
      query: kql,
      selectionStart,
      selectionEnd,
      boolFilter: [],
    });
    querySuggestions = batch ?? [];
  } catch {
    return [];
  }

  const merged = mergeTriggerEventSchemaValueSuggestions(
    def.eventSchema,
    kql,
    selectionStart,
    selectionEnd,
    querySuggestions
  );

  return mapQuerySuggestionsToMonaco(merged, ctx.model, contentStartInFile, kql, selectionStart);
}
