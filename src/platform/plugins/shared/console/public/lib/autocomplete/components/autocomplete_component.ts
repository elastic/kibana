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

export interface AutocompleteMatchResult {
  context_values?: Record<string, unknown>;
  next?: AutocompleteComponent | AutocompleteComponent[];
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
  /*
 if the current matcher matches this term, this method should return an object with the following keys
 {
 context_values: {
 values extract from term that should be added to the context
 }
 next: AutocompleteComponent(s) to use next
 priority: optional priority to solve collisions between multiple paths. Min value is used across entire chain
 }
 */
  match(_token?: unknown, _context?: unknown, _editor?: unknown): AutocompleteMatch {
    return {
      next: this.next,
    };
  }
}
