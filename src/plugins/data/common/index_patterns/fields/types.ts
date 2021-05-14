/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldSpec, IFieldSubType, IndexPattern } from '../..';

export interface IFieldType {
  name: string;
  /**
   * Kibana/javascript type - string, number, etc
   */
  type: string;
  script?: string;
  lang?: string;
  count?: number;
  /**
   * Elasticsearch types. Multiple ES types may or may not conflict depending upon their kibana equivalents
   */
  esTypes?: string[];
  aggregatable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  visualizable?: boolean;
  readFromDocValues?: boolean;
  scripted?: boolean;
  /**
   * Expresses the structure of multi and nested fields
   */
  subType?: IFieldSubType;
  displayName?: string;
  customLabel?: string;
  format?: any;
  toSpec?: (options?: { getFormatterForField?: IndexPattern['getFormatterForField'] }) => FieldSpec;
}
