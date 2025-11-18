/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../commands_registry/types';
import type { SortingContext } from './types';
import { calculatePriority } from './priority_provider';

export class SuggestionOrderingEngine {
  /**
   * Sorts suggestions and assigns sortText for Monaco editor.
   * Lower priority number = appears first in list.
   */
  sort(suggestions: ISuggestionItem[], context: SortingContext): ISuggestionItem[] {
    // Early return for empty or single-item arrays
    if (suggestions.length <= 1) {
      return suggestions.map((s, i) => ({ ...s, sortText: '0000' }));
    }

    const withPriorities = suggestions.map((suggestion) => {
      const priority = calculatePriority(suggestion, context);

      return {
        suggestion,
        priority,
      };
    });

    withPriorities.sort((a, b) => {
      const diff = a.priority - b.priority;

      if (diff !== 0) {
        return diff;
      }

      return a.suggestion.label.localeCompare(b.suggestion.label);
    });

    return withPriorities.map(({ suggestion }, index) => ({
      ...suggestion,
      // Zero-pad to ensure "0001" < "0010" < "0100" lexicographically
      sortText: index.toString().padStart(4, '0'),
    }));
  }
}
