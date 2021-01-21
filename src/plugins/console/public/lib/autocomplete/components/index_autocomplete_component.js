/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { getIndices } from '../../mappings/mappings';
import { ListComponent } from './list_component';
function nonValidIndexType(token) {
  return !(token === '_all' || token[0] !== '_');
}
export class IndexAutocompleteComponent extends ListComponent {
  constructor(name, parent, multiValued) {
    super(name, getIndices, parent, multiValued);
  }
  validateTokens(tokens) {
    if (!this.multiValued && tokens.length > 1) {
      return false;
    }
    return !_.find(tokens, nonValidIndexType);
  }

  getDefaultTermMeta() {
    return 'index';
  }

  getContextKey() {
    return 'indices';
  }
}
