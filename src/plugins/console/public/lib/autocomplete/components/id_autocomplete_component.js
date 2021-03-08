/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { SharedComponent } from './shared_component';
export class IdAutocompleteComponent extends SharedComponent {
  constructor(name, parent, multi) {
    super(name, parent);
    this.multi_match = multi;
  }
  match(token, context, editor) {
    if (!token) {
      return null;
    }
    if (!this.multi_match && Array.isArray(token)) {
      return null;
    }
    token = Array.isArray(token) ? token : [token];
    if (
      _.find(token, function (t) {
        return t.match(/[\/,]/);
      })
    ) {
      return null;
    }
    const r = super.match(token, context, editor);
    r.context_values = r.context_values || {};
    r.context_values.id = token;
    return r;
  }
}
