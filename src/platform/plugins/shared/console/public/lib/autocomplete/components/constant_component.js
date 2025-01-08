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
export class ConstantComponent extends SharedComponent {
  constructor(name, parent, options) {
    super(name, parent);
    if (_.isString(options)) {
      options = [options];
    }
    this.options = options || [name];
  }
  getTerms() {
    return this.options;
  }

  addOption(options) {
    if (!Array.isArray(options)) {
      options = [options];
    }

    [].push.apply(this.options, options);
    this.options = _.uniq(this.options);
  }
  match(token, context, editor) {
    if (token !== this.name) {
      return null;
    }

    return super.match(token, context, editor);
  }
}
