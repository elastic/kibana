/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ValueSuggestionsMethod } from '@kbn/data-plugin/common';
// import type { IIndexPattern } from '@kbn/data-plugin/common';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';

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
