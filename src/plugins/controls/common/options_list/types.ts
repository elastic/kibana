/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, FieldSpec, RuntimeFieldSpec } from '@kbn/data-views-plugin/common';
import type { BoolQuery, Filter, Query, TimeRange } from '@kbn/es-query';

import type { DataControlInput } from '../types';
import { OptionsListSelection } from './options_list_selections';
import { OptionsListSearchTechnique } from './suggestions_searching';
import type { OptionsListSortingType } from './suggestions_sorting';

export const OPTIONS_LIST_CONTROL = 'optionsListControl'; // TODO: Replace with OPTIONS_LIST_CONTROL_TYPE

export interface OptionsListEmbeddableInput extends DataControlInput {
  searchTechnique?: OptionsListSearchTechnique;
  sort?: OptionsListSortingType;
  selectedOptions?: OptionsListSelection[];
  existsSelected?: boolean;
  runPastTimeout?: boolean;
  singleSelect?: boolean;
  hideActionBar?: boolean;
  hideExclude?: boolean;
  hideExists?: boolean;
  placeholder?: string;
  hideSort?: boolean;
  exclude?: boolean;
}

export type OptionsListSuggestions = Array<{ value: OptionsListSelection; docCount?: number }>;

/**
 * The Options list response is returned from the serverside Options List route.
 */
export interface OptionsListSuccessResponse {
  suggestions: OptionsListSuggestions;
  totalCardinality?: number; // total cardinality will be undefined when `useExpensiveQueries` is `false`
  invalidSelections?: OptionsListSelection[];
}

/**
 * The invalid selections are parsed **after** the server returns with the result from the ES client; so, the
 * suggestion aggregation parser only returns the suggestions list + the cardinality of the result
 */
export type OptionsListParsedSuggestions = Pick<
  OptionsListSuccessResponse,
  'suggestions' | 'totalCardinality'
>;

export interface OptionsListFailureResponse {
  error: 'aborted' | Error;
}

export type OptionsListResponse = OptionsListSuccessResponse | OptionsListFailureResponse;

/**
 * The Options list request type taken in by the public Options List service.
 */
export type OptionsListRequest = Omit<
  OptionsListRequestBody,
  'filters' | 'fieldName' | 'fieldSpec'
> & {
  timeRange?: TimeRange;
  dataView: DataView;
  filters?: Filter[];
  field: FieldSpec;
  query?: Query;
};

/**
 * The Options list request body is sent to the serverside Options List route and is used to create the ES query.
 */
export interface OptionsListRequestBody
  extends Pick<
    OptionsListEmbeddableInput,
    'fieldName' | 'searchTechnique' | 'sort' | 'selectedOptions'
  > {
  runtimeFieldMap?: Record<string, RuntimeFieldSpec>;
  allowExpensiveQueries: boolean;
  filters?: Array<{ bool: BoolQuery }>;
  runPastTimeout?: boolean;
  searchString?: string;
  fieldSpec?: FieldSpec;
  size: number;
}
