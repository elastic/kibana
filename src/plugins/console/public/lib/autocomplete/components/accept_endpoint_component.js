/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { SharedComponent } from './shared_component';
export const URL_PATH_END_MARKER = '__url_path_end__';

export class AcceptEndpointComponent extends SharedComponent {
  constructor(endpoint, parent) {
    super(endpoint.id, parent);
    this.endpoint = endpoint;
  }
  match(token, context, editor) {
    if (token !== URL_PATH_END_MARKER) {
      return null;
    }
    if (this.endpoint.methods && -1 === _.indexOf(this.endpoint.methods, context.method)) {
      return null;
    }
    const r = super.match(token, context, editor);
    r.context_values = r.context_values || {};
    r.context_values.endpoint = this.endpoint;
    if (_.isNumber(this.endpoint.priority)) {
      r.priority = this.endpoint.priority;
    }
    return r;
  }
}
