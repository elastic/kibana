/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { KbnFieldTypeOptions, ES_FIELD_TYPES, KBN_FIELD_TYPES } from './types';

export class KbnFieldType {
  public readonly name: string;
  public readonly sortable: boolean;
  public readonly filterable: boolean;
  public readonly esTypes: readonly ES_FIELD_TYPES[];

  constructor(options: Partial<KbnFieldTypeOptions> = {}) {
    this.name = options.name || KBN_FIELD_TYPES.UNKNOWN;
    this.sortable = options.sortable || false;
    this.filterable = options.filterable || false;
    this.esTypes = Object.freeze((options.esTypes || []).slice());
  }
}
