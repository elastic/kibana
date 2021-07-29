/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IndexPatternFieldBase } from '@kbn/es-query';
import { FieldSpec, IndexPattern } from '../..';

/**
 * @deprecated Use `IndexPatternField` or `FieldSpec` instead
 * @removeBy 8.0
 */
export interface IFieldType extends IndexPatternFieldBase {
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
  displayName?: string;
  customLabel?: string;
  format?: any;
  toSpec?: (options?: { getFormatterForField?: IndexPattern['getFormatterForField'] }) => FieldSpec;
}
