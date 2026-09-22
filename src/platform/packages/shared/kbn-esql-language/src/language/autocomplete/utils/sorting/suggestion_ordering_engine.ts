/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../commands/registry/types';
import type { SortingContext } from './types';
import { calculatePriority } from './priority_provider';

export class SuggestionOrderingEngine {
  /**
   * Sorts suggestions based on their inferred category and context.
   * Lower priority number = appears first in list.
   */
  sort(suggestions: ISuggestionItem[], context: SortingContext): ISuggestionItem[] {
    if (suggestions.length === 0) {
      return suggestions;
    }

    // Single item doesn't need sorting but still gets sortText for compatibility
    if (suggestions.length === 1) {
      suggestions[0].sortText = '0000';
      return suggestions;
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

      // Case-insensitive alphabetical sorting for items with same priority
      return a.suggestion.label.localeCompare(b.suggestion.label, undefined, {
        sensitivity: 'base',
      });
    });

    return withPriorities.map(({ suggestion }, index) => {
      suggestion.sortText = index.toString().padStart(4, '0');

      return suggestion;
    });
  }
}
