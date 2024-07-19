/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { getAutocompleteInfo, ENTITIES } from '../../../services';
import { ListComponent } from './list_component';

function nonValidIndexType(token) {
  return !(token === '_all' || token[0] !== '_');
}

export class IndexAutocompleteComponent extends ListComponent {
  constructor(name, parent, multiValued) {
    super(name, getAutocompleteInfo().getEntityProvider(ENTITIES.INDICES), parent, multiValued);
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
