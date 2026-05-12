/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type monaco } from '@kbn/monaco';

/** Category of suggestion, used for icon selection and context label. */
export type SuggestionCategory =
  | 'connector'
  | 'step'
  | 'param'
  | 'variable'
  | 'filter'
  | 'keyword'
  | 'value'
  | 'trigger';

/**
 * A suggestion item enriched with structured metadata for the custom suggest widget.
 * Carries both the data needed for text insertion (from CompletionItem) and the
 * structured details panel data (types, required, description) that Monaco's
 * built-in suggest widget can't render.
 */
export interface EnrichedSuggestionItem {
  /** Display label shown in the suggestion list */
  label: string;
  /** Text to insert when accepted */
  insertText: string;
  /** Whether insertText is a snippet (contains $1, $2 placeholders) */
  insertTextRules?: number;
  /** Monaco completion item kind (for fallback icon mapping) */
  kind: monaco.languages.CompletionItemKind;
  /** Replacement range */
  range: monaco.IRange;
  /** Text used for filtering (defaults to label if not set) */
  filterText?: string;
  /** Text used for sorting */
  sortText?: string;
  /** Additional edits to apply alongside the main insertion (e.g., removing @ trigger) */
  additionalTextEdits?: monaco.languages.CompletionItem['additionalTextEdits'];
  /** Whether this item should be pre-selected */
  preselect?: boolean;
  /** Optional command to execute after acceptance (e.g., create connector) */
  command?: monaco.languages.Command;

  // ── Enriched metadata (NOT available in standard CompletionItem) ──

  /** Type names for badge rendering, e.g. ['string', 'array'] */
  types: string[];
  /** Whether the parameter is required. null = unknown/not applicable */
  required: boolean | null;
  /** Human-readable description */
  description: string;
  /** Default value as displayable string */
  defaultValue?: string;
  /** Usage example */
  example?: string;
  /** Suggestion category for icon and context label */
  category: SuggestionCategory;
  /** Context label shown above the item name in details panel, e.g. "Elasticsearch.search Parameter" */
  contextLabel?: string;
}

/** Payload emitted by the completion provider to the custom suggest widget. */
export interface SuggestionsPayload {
  /** URI of the Monaco model the suggestions belong to — subscribers filter on this. */
  modelUri: string;
  items: EnrichedSuggestionItem[];
  anchorPosition: { lineNumber: number; column: number };
  triggerKind: 'auto' | 'manual';
}
