/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLMessage } from '@kbn/esql-ast';
import type { ESQLFieldWithMetadata } from '@kbn/esql-ast/src/commands_registry/types';
import { ESQLPolicy, ESQLUserDefinedColumn } from '@kbn/esql-ast/src/commands_registry/types';
import type { IndexAutocompleteItem } from '@kbn/esql-types';
import type { EditorError } from '../types';

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
