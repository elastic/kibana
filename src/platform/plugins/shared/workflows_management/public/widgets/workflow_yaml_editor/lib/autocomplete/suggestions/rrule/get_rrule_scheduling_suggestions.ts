/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { generateRRuleTriggerSnippet } from '../../../snippets/generate_trigger_snippet';

/**
 * Get RRule scheduling pattern suggestions
 */
export function getRRuleSchedulingSuggestions(
  range: monaco.IRange
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];

  const rrulePatterns = [
    {
      label: 'Daily at 9 AM',
      description: 'Run daily at 9:00 AM UTC',
      pattern: 'daily' as const,
    },
    {
      label: 'Business hours (weekdays 8 AM & 5 PM)',
      description: 'Run on weekdays at 8 AM and 5 PM EST',
      pattern: 'weekly' as const,
    },
    {
      label: 'Monthly on 1st and 15th',
      description: 'Run monthly on 1st and 15th at 10:30 AM UTC',
      pattern: 'monthly' as const,
    },
    {
      label: 'Custom RRule',
      description: 'Create a custom RRule configuration with all options',
      pattern: 'custom' as const,
    },
  ];

  rrulePatterns.forEach(({ label, description, pattern }) => {
    const snippetText = generateRRuleTriggerSnippet(pattern, {
      monacoSuggestionFormat: true,
    });

    // Extended range for multi-line insertion
    const extendedRange = {
      startLineNumber: range.startLineNumber,
      endLineNumber: range.endLineNumber,
      startColumn: range.startColumn,
      endColumn: Math.max(range.endColumn, 1000),
    };

    suggestions.push({
      label,
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: snippetText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: extendedRange,
      documentation: description,
      filterText: label,
      sortText: `!rrule-${pattern}`, // Priority prefix for RRule suggestions
      detail: 'RRule scheduling pattern',
      preselect: false,
    });
  });

  return suggestions;
}
