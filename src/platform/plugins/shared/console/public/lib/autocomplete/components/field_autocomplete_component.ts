/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { getAutocompleteInfo, ENTITIES } from '../../../services';
import { ListComponent } from './list_component';
import type { AutoCompleteContext } from '../types';
import type { AutocompleteTermDefinition } from './autocomplete_component';
import type { SharedComponent } from './shared_component';
import { isRecord } from '../../../../common/utils/record_utils';
import { asStringArray } from '../../utils/array_utils';

function FieldGenerator(context?: AutoCompleteContext): AutocompleteTermDefinition[] {
  if (!context) {
    return [];
  }

  const indices = asStringArray(context.indices);
  const types = asStringArray(context.types);

  const entityContext = Object.assign(Object.create(Object.getPrototypeOf(context)), {
    indices,
    types,
  });

  const fields = getAutocompleteInfo().getEntityProvider(ENTITIES.FIELDS, entityContext);
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields.reduce<AutocompleteTermDefinition[]>((acc, field) => {
    if (!isRecord(field)) {
      return acc;
    }

    const name = field.name;
    const type = field.type;

    if (typeof name === 'string' && typeof type === 'string') {
      acc.push({ name, meta: type });
    }

    return acc;
  }, []);
}

export class FieldAutocompleteComponent extends ListComponent {
  constructor(name: string, parent?: SharedComponent, multiValued?: boolean) {
    super(name, FieldGenerator, parent, multiValued);
  }
  validateTokens(tokens: string[]) {
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
