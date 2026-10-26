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
  AutocompleteTermDefinition,
} from './autocomplete_component';
import type { AutoCompleteContext } from '../types';
export class ConditionalProxy extends SharedComponent {
  predicate: (context: AutoCompleteContext, editor: unknown) => boolean;
  delegate: AutocompleteComponent;

  constructor(
    predicate: (context: AutoCompleteContext, editor: unknown) => boolean,
    delegate: AutocompleteComponent
  ) {
    super('__condition');
    this.predicate = predicate;
    this.delegate = delegate;
  }

  getTerms(context: AutoCompleteContext, editor: unknown): AutocompleteTermDefinition[] | null {
    if (this.predicate(context, editor)) {
      return this.delegate.getTerms(context, editor) ?? null;
    }
    return null;
  }

  match(token: unknown, context: AutoCompleteContext, editor: unknown): AutocompleteMatch {
    if (this.predicate(context, editor)) {
      return this.delegate.match(token, context, editor);
    } else {
      return false;
    }
  }
}
