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

import { IFieldType, IIndexPattern } from '../../../common/index_patterns';

export type QuerySyntaxSuggestionType =
  | 'field'
  | 'value'
  | 'operator'
  | 'conjunction'
  | 'recentSearch';

export type QuerySyntaxProvider = (args: {
  indexPatterns: IIndexPattern[];
  boolFilter?: any;
}) => QuerySyntaxGetSuggestions;

export type QuerySyntaxGetSuggestions = (args: {
  query: string;
  selectionStart: number;
  selectionEnd: number;
  signal?: AbortSignal;
}) => Promise<QuerySyntaxSuggestion[]>;

interface BasicQuerySyntaxSuggestion {
  type: QuerySyntaxSuggestionType;
  description?: string;
  end: number;
  start: number;
  text: string;
  cursorIndex?: number;
}

type FieldQuerySyntaxSuggestion = BasicQuerySyntaxSuggestion & {
  type: 'field';
  field: IFieldType;
};

// A union type allows us to do easy type guards in the code. For example, if I want to ensure I'm
// working with a FieldAutocompleteSuggestion, I can just do `if ('field' in suggestion)` and the
// TypeScript compiler will narrow the type to the parts of the union that have a field prop.
/** @public **/
export type QuerySyntaxSuggestion = BasicQuerySyntaxSuggestion | FieldQuerySyntaxSuggestion;
