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
import type { AutocompleteMatch, AutocompleteTermDefinition } from './autocomplete_component';
import type { AutoCompleteContext } from '../types';
import { asArray } from '../../utils/array_utils';
export class ConstantComponent extends SharedComponent {
  options: AutocompleteTermDefinition[];

  constructor(
    name: string,
    parent?: SharedComponent,
    options?: AutocompleteTermDefinition | AutocompleteTermDefinition[]
  ) {
    super(name, parent);
    this.options = options !== undefined ? asArray(options) : [name];
  }
  getTerms(): AutocompleteTermDefinition[] {
    return this.options;
  }

  addOption(options: AutocompleteTermDefinition | AutocompleteTermDefinition[]) {
    this.options.push(...asArray(options));
    this.options = _.uniq(this.options);
  }

  match(token: unknown, context: AutoCompleteContext, editor: unknown): AutocompleteMatch {
    if (token !== this.name) {
      return null;
    }

    return super.match(token, context, editor);
  }
}
