/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldDefinition } from './field_definition';

export interface CategorizedFields {
  [category: string]: {
    count: number;
    fields: FieldDefinition[];
  };
}

export interface CategoryCounts {
  [category: string]: number;
}
