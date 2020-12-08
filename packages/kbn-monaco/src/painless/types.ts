/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
