/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { SharedComponent } from '.';
import type {
  AutocompleteComponent,
  AutocompleteMatch,
  AutocompleteMatchResult,
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

type MatchResultWithNextArray = AutocompleteMatchResult & { next: AutocompleteComponent[] };

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

    // try to link to GLOBAL rules
    const globalRules = context.globalComponentResolver(token, false);
    if (globalRules) {
      result.next.push(...globalRules);
    }

    if (result.next.length) {
      return result;
    }
    _.each(this.patternsAndWildCards, function (component) {
      const componentResult = component.match(token, context, editor);
      if (componentResult && componentResult.next) {
        result.next.push(...asArray(componentResult.next));
      }
    });

    return result;
  }
}
