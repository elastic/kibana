/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLMessage, ESQLLocation } from '@kbn/esql-ast';
import type { IndexAutocompleteItem } from '@kbn/esql-types';
import { FieldType, SupportedDataType } from '../definitions/types';
import type { EditorError } from '../types';

export interface ESQLUserDefinedColumn {
  name: string;
  // invalid expressions produce columns of type "unknown"
  // also, there are some cases where we can't yet infer the type of
  // a valid expression as with `CASE` which can return union types
  type: SupportedDataType | 'unknown';
  location: ESQLLocation;
}

export interface ESQLFieldWithMetadata {
  name: string;
  type: FieldType;
  isEcs?: boolean;
  hasConflict?: boolean;
  metadata?: {
    description?: string;
  };
}

export interface ESQLPolicy {
  name: string;
  sourceIndices: string[];
  matchField: string;
  enrichFields: string[];
}

export interface ReferenceMaps {
  sources: Set<string>;
  userDefinedColumns: Map<string, ESQLUserDefinedColumn[]>;
  fields: Map<string, ESQLFieldWithMetadata>;
  policies: Map<string, ESQLPolicy>;
  query: string;
  joinIndices: IndexAutocompleteItem[];
}

export interface ValidationResult {
  errors: Array<ESQLMessage | EditorError>;
  warnings: ESQLMessage[];
}

export interface ValidationOptions {
  ignoreOnMissingCallbacks?: boolean;
}
