/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../commands_registry/types';
import { SuggestionCategory } from '../types';
import { getOperatorCategory } from './operator_categories';

/** Determines the category of a suggestion for priority calculation. */
export function detectCategory({ sortText, kind, label }: ISuggestionItem): SuggestionCategory {
  if (sortText) {
    const fromSortText = detectFromSortText(sortText, kind, label);

    if (fromSortText !== SuggestionCategory.UNKNOWN) {
      return fromSortText;
    }
  }

  return detectFromKind(kind, label);
}

/** Detects category from existing sortText (preserves original categorization). */
function detectFromSortText(
  sortText: string,
  kind: ISuggestionItem['kind'],
  label: string
): SuggestionCategory {
  // Numeric sortText (single or double digit) = high priority items
  if (/^\d{1,2}$/.test(sortText)) {
    return kind === 'Variable' || kind === 'Field'
      ? SuggestionCategory.USER_DEFINED_COLUMN
      : SuggestionCategory.CRITICAL_ACTION;
  }

  switch (sortText) {
    case '1A':
      return SuggestionCategory.TIME_PARAM;
    case '1C':
      return SuggestionCategory.RECOMMENDED_FIELD;
    case '1D':
      return SuggestionCategory.ECS_FIELD;
    case 'A':
      return kind === 'Function' ? SuggestionCategory.FUNCTION_AGG : SuggestionCategory.UNKNOWN;
    case 'B':
      return SuggestionCategory.COMMA;
    case 'C':
      return kind === 'Function' ? SuggestionCategory.FUNCTION_SCALAR : SuggestionCategory.UNKNOWN;
    case 'D':
      return kind === 'Operator' ? getOperatorCategory(label) : SuggestionCategory.FIELD;
    default:
      return SuggestionCategory.UNKNOWN;
  }
}

/** Detects category from suggestion kind when sortText is not available. */
function detectFromKind(kind: ISuggestionItem['kind'], label: string): SuggestionCategory {
  switch (kind) {
    case 'Function':
      return SuggestionCategory.FUNCTION_SCALAR;

    case 'Variable':
    case 'Field':
      return detectFieldCategory(label);

    case 'Keyword':
      return detectKeywordCategory(label);

    case 'Operator':
      return getOperatorCategory(label);

    case 'Method':
      return SuggestionCategory.PROCESSING_COMMAND;

    default:
      return SuggestionCategory.UNKNOWN;
  }
}

function detectFieldCategory(label: string): SuggestionCategory {
  if (label.includes('@timestamp') || label.endsWith('_time') || label.endsWith('.keyword')) {
    return SuggestionCategory.TIME_FIELD;
  }

  return SuggestionCategory.FIELD;
}

function detectKeywordCategory(label: string): SuggestionCategory {
  if (label === '|') {
    return SuggestionCategory.PIPE;
  }

  if (label === ',') {
    return SuggestionCategory.COMMA;
  }

  return SuggestionCategory.KEYWORD;
}
