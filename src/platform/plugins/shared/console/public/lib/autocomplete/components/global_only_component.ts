/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SharedComponent } from './shared_component';
import type {
  AutocompleteComponent,
  AutocompleteMatch,
  AutocompleteMatchResult,
  AutocompleteTermDefinition,
} from './autocomplete_component';
import type { AutoCompleteContext } from '../types';

type GlobalOnlyContext = AutoCompleteContext & {
  globalComponentResolver: (
    token: unknown,
    nested: boolean
  ) => AutocompleteComponent[] | undefined | null;
};

type MatchResultWithNextArray = AutocompleteMatchResult & { next: AutocompleteComponent[] };

export class GlobalOnlyComponent extends SharedComponent {
  getTerms(): AutocompleteTermDefinition[] | null {
    return null;
  }

  match(token: unknown, context: GlobalOnlyContext): AutocompleteMatch {
    const result: MatchResultWithNextArray = {
      next: [],
    };

    // try to link to GLOBAL rules
    const globalRules = context.globalComponentResolver(token, false);
    if (globalRules) {
      result.next.push(...globalRules);
    }

    if (result.next.length) {
      return result;
    }
    // just loop back to us
    result.next = [this];

    return result;
  }
}
