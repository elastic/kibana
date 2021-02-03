/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FieldSpec, IFieldSubType, IndexPattern } from '../..';

export interface IFieldType {
  name: string;
  type: string;
  script?: string;
  lang?: string;
  count?: number;
  // esTypes might be undefined on old index patterns that have not been refreshed since we added
  // this prop. It is also undefined on scripted fields.
  esTypes?: string[];
  aggregatable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  visualizable?: boolean;
  readFromDocValues?: boolean;
  scripted?: boolean;
  subType?: IFieldSubType;
  displayName?: string;
  customLabel?: string;
  format?: any;
  toSpec?: (options?: { getFormatterForField?: IndexPattern['getFormatterForField'] }) => FieldSpec;
}
