/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { getFields } from '../../mappings/mappings';
import { ListComponent } from './list_component';

function FieldGenerator(context) {
  return _.map(getFields(context.indices, context.types), function (field) {
    return { name: field.name, meta: field.type };
  });
}

export class FieldAutocompleteComponent extends ListComponent {
  constructor(name, parent, multiValued) {
    super(name, FieldGenerator, parent, multiValued);
  }
  validateTokens(tokens) {
    if (!this.multiValued && tokens.length > 1) {
      return false;
    }

    return !_.find(tokens, function (token) {
      return token.match(/[^\w.?*]/);
    });
  }

  getDefaultTermMeta() {
    return 'field';
  }

  getContextKey() {
    return 'fields';
  }
}
