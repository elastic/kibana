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
import { OptionsListSearchTechnique } from './suggestions_searching';
import type { OptionsListSortingType } from './suggestions_sorting';

export const OPTIONS_LIST_CONTROL = 'optionsListControl'; // TODO: Replace with OPTIONS_LIST_CONTROL_TYPE

export interface OptionsListEmbeddableInput extends DataControlInput {
  searchTechnique?: OptionsListSearchTechnique;
  sort?: OptionsListSortingType;
  selectedOptions?: string[];
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

export type OptionsListSuggestions = Array<{ value: string; docCount?: number }>;

/**
 * The Options list response is returned from the serverside Options List route.
 */
export interface OptionsListSuccessResponse {
  suggestions: OptionsListSuggestions;
  totalCardinality?: number; // total cardinality will be undefined when `useExpensiveQueries` is `false`
  invalidSelections?: string[];
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
  'filters' | 'fieldName' | 'fieldSpec' | 'textFieldName'
> & {
  searchTechnique?: OptionsListSearchTechnique;
  allowExpensiveQueries: boolean;
  timeRange?: TimeRange;
  runPastTimeout?: boolean;
  dataView: DataView;
  filters?: Filter[];
  field: FieldSpec;
  query?: Query;
};

/**
 * The Options list request body is sent to the serverside Options List route and is used to create the ES query.
 */
export interface OptionsListRequestBody {
  runtimeFieldMap?: Record<string, RuntimeFieldSpec>;
  searchTechnique?: OptionsListSearchTechnique;
  allowExpensiveQueries: boolean;
  sort?: OptionsListSortingType;
  filters?: Array<{ bool: BoolQuery }>;
  selectedOptions?: Array<string | number>;
  runPastTimeout?: boolean;
  searchString?: string;
  fieldSpec?: FieldSpec;
  fieldName: string;
  size: number;
}
