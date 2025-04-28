/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type PainlessCompletionKind =
  | 'type'
  | 'class'
  | 'method'
  | 'constructor'
  | 'property'
  | 'field'
  | 'keyword';

export type PainlessContext =
  | 'painless_test'
  | 'filter'
  | 'score'
  | 'boolean_script_field_script_field'
  | 'date_script_field'
  | 'double_script_field_script_field'
  | 'ip_script_field_script_field'
  | 'long_script_field_script_field'
  | 'processor_conditional'
  | 'string_script_field_script_field';

export interface PainlessCompletionItem {
  label: string;
  kind: PainlessCompletionKind;
  documentation: string;
  insertText: string;
  insertTextAsSnippet?: boolean;
}

export interface PainlessCompletionResult {
  isIncomplete: boolean;
  suggestions: PainlessCompletionItem[];
}

export interface PainlessAutocompleteField {
  name: string;
  type: string;
}
