/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SharedComponent } from './shared_component';
export class SimpleParamComponent extends SharedComponent {
  constructor(name, parent) {
    super(name, parent);
  }
  match(token, context, editor) {
    const result = super.match(token, context, editor);
    result.context_values = result.context_values || {};
    result.context_values[this.name] = token;
    return result;
  }
}
