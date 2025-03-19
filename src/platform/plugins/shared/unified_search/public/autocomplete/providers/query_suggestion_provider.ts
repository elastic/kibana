/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ValueSuggestionsMethod } from '@kbn/data-plugin/common';
// for replace IIndexPattern => DataView need to fix the issue https://github.com/elastic/kibana/issues/131292
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { SuggestionsAbstraction } from '../../typeahead/suggestions_component';

export enum QuerySuggestionTypes {
  Field = 'field',
  Value = 'value',
  Operator = 'operator',
  Conjunction = 'conjunction',
  RecentSearch = 'recentSearch',
}

export type QuerySuggestionGetFn = (
  args: QuerySuggestionGetFnArgs
) => Promise<QuerySuggestion[]> | undefined;

/** @public **/
export interface QuerySuggestionGetFnArgs {
  language: string;
  indexPatterns: DataView[];
  query: string;
  selectionStart: number;
  selectionEnd: number;
  signal?: AbortSignal;
  useTimeRange?: boolean;
  boolFilter?: any;
  method?: ValueSuggestionsMethod;
  suggestionsAbstraction?: SuggestionsAbstraction;
}

/** @public **/
export interface QuerySuggestionBasic {
  type: QuerySuggestionTypes;
  description?: string | JSX.Element;
  end: number;
  start: number;
  text: string;
  cursorIndex?: number;
}

/** @public **/
export interface QuerySuggestionField extends QuerySuggestionBasic {
  type: QuerySuggestionTypes.Field;
  field: DataViewField;
}

/** @public **/
export type QuerySuggestion = QuerySuggestionBasic | QuerySuggestionField;
