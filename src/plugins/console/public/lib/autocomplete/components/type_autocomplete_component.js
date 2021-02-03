/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { ListComponent } from './list_component';
import { getTypes } from '../../mappings/mappings';
function TypeGenerator(context) {
  return getTypes(context.indices);
}
function nonValidIndexType(token) {
  return !(token === '_all' || token[0] !== '_');
}
export class TypeAutocompleteComponent extends ListComponent {
  constructor(name, parent, multiValued) {
    super(name, TypeGenerator, parent, multiValued);
  }
  validateTokens(tokens) {
    if (!this.multiValued && tokens.length > 1) {
      return false;
    }

    return !_.find(tokens, nonValidIndexType);
  }

  getDefaultTermMeta() {
    return 'type';
  }

  getContextKey() {
    return 'types';
  }
}
