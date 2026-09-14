/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { SharedComponent } from './shared_component';
import type {
  AutocompleteComponent,
  AutocompleteMatch,
  AutocompleteMatchResult,
  AutocompleteNextGroup,
  AutocompleteTermDefinition,
} from './autocomplete_component';
import type { AutoCompleteContext } from '../types';
import { asArray } from '../../utils/array_utils';
/**
 * @param constants list of components that represent constant keys
 * @param patternsAndWildCards list of components that represent patterns and should be matched only if
 * there is no constant matches
 */
type ObjectComponentContext = AutoCompleteContext & {
  globalComponentResolver: (
    token: unknown,
    nested: boolean
  ) => AutocompleteComponent[] | undefined | null;
};

type MatchResultWithNextArray = AutocompleteMatchResult & {
  next: AutocompleteComponent[];
  nextGroups?: AutocompleteNextGroup[];
};

export class ObjectComponent extends SharedComponent {
  constants: AutocompleteComponent[];
  patternsAndWildCards: AutocompleteComponent[];

  constructor(
    name: string,
    constants: AutocompleteComponent[],
    patternsAndWildCards: AutocompleteComponent[]
  ) {
    super(name);
    this.constants = constants;
    this.patternsAndWildCards = patternsAndWildCards;
  }
  getTerms(context: ObjectComponentContext, editor: unknown): AutocompleteTermDefinition[] {
    const options: AutocompleteTermDefinition[] = [];
    _.each(this.constants, function (component) {
      const terms = component.getTerms(context, editor);
      if (terms) {
        options.push(...terms);
      }
    });
    _.each(this.patternsAndWildCards, function (component) {
      const terms = component.getTerms(context, editor);
      if (terms) {
        options.push(...terms);
      }
    });
    return options;
  }

  match(token: unknown, context: ObjectComponentContext, editor: unknown): AutocompleteMatch {
    const result: MatchResultWithNextArray = {
      next: [],
    };
    _.each(this.constants, function (component) {
      const componentResult = component.match(token, context, editor);
      if (componentResult && componentResult.next) {
        result.next.push(...asArray(componentResult.next));
      }
    });

    // Constants preempt pattern rules, so patterns are only consulted when no
    // constant child matched.
    if (!result.next.length) {
      _.each(this.patternsAndWildCards, function (component) {
        const componentResult = component.match(token, context, editor);
        if (componentResult && componentResult.next) {
          result.next.push(...asArray(componentResult.next));
        }
      });
    }

    // Same-name GLOBAL rules are kept as a fallback branch: the engine drops
    // their suggestions after the walk when the explicit branch above produced
    // suggestions of its own (see populateContext in engine.ts).
    const explicitMatches = result.next.slice();
    const globalRules = context.globalComponentResolver(token, false);
    if (globalRules?.length) {
      result.next.push(...globalRules);
      if (explicitMatches.length) {
        result.nextGroups = [{ next: explicitMatches }, { next: globalRules, fallback: true }];
      }
    }

    return result;
  }
}
