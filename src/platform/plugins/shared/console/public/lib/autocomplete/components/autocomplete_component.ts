/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResultTerm } from '../types';

export type AutocompleteTermDefinition = string | ResultTerm;

export interface AutocompleteNextGroup {
  next?: AutocompleteComponent | AutocompleteComponent[];
  fallback?: boolean;
}

export interface AutocompleteContinuationState {
  parentName?: string;
  components: AutocompleteComponent[];
  contextExtensionList: Array<Record<string, unknown>>;
  fallbackGroups: string[];
  preferredFallbackGroups: string[];
  priority?: number;
  specificity: number;
}

/**
 * Describes how path walking continues after a component matches.
 *
 * `context_values` extends the context for this branch, and `priority` contributes the minimum
 * priority used across the chain. `next` contains ungrouped component continuations. `nextGroups`
 * separates preferred and fallback continuations. `nextStates` carries pre-resolved continuation
 * context and fallback metadata, such as across scope links. `nextStates` takes precedence over
 * the component forms, and `nextGroups` takes precedence over `next`.
 */
export interface AutocompleteMatchResult {
  context_values?: Record<string, unknown>;
  next?: AutocompleteComponent | AutocompleteComponent[];
  nextGroups?: AutocompleteNextGroup[];
  nextStates?: AutocompleteContinuationState[];
  priority?: number;
}

export type AutocompleteMatch = AutocompleteMatchResult | null | false | undefined;

export class AutocompleteComponent {
  name: string;
  next?: AutocompleteComponent[];

  constructor(name: string) {
    this.name = name;
  }
  /** called to get the possible suggestions for tokens, when this object is at the end of
   * the resolving chain (and thus can suggest possible continuation paths)
   */
  getTerms(_context?: unknown, _editor?: unknown): AutocompleteTermDefinition[] | null | undefined {
    return [];
  }
  /** Returns continuation metadata when this component matches, or a falsy value otherwise. */
  match(_token?: unknown, _context?: unknown, _editor?: unknown): AutocompleteMatch {
    return {
      next: this.next,
    };
  }
}
