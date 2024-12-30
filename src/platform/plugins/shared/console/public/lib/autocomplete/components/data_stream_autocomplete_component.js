/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ListComponent } from './list_component';
import { getAutocompleteInfo, ENTITIES } from '../../../services';

export class DataStreamAutocompleteComponent extends ListComponent {
  constructor(name, parent, multiValued) {
    super(
      name,
      getAutocompleteInfo().getEntityProvider(ENTITIES.DATA_STREAMS),
      parent,
      multiValued
    );
  }

  getContextKey() {
    return 'data_stream';
  }
}
