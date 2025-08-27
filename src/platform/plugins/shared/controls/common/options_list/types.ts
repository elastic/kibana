/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, FieldSpec, RuntimeFieldSpec } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, BoolQuery, Filter, Query, TimeRange } from '@kbn/es-query';

import type { ESQLControlState } from '@kbn/esql-types';
import type { OptionsListSelection } from './options_list_selections';
import type { OptionsListSortingType } from './suggestions_sorting';
import type { DefaultDataControlState } from '../types';
import type { OptionsListSearchTechnique } from './suggestions_searching';

/**
 * ----------------------------------------------------------------
 * Options list state types
 * ----------------------------------------------------------------
 */

export interface OptionsListDisplaySettings {
  placeholder?: string;
  hideActionBar?: boolean;
  hideExclude?: boolean;
  hideExists?: boolean;
  hideSort?: boolean;
}

type OptionsListBaseControlState = OptionsListDisplaySettings & {
  searchTechnique?: OptionsListSearchTechnique;
  sort?: OptionsListSortingType;
  selectedOptions?: OptionsListSelection[];
  existsSelected?: boolean;
  runPastTimeout?: boolean;
  singleSelect?: boolean;
  exclude?: boolean;
};
export type OptionsListDataControlState = DefaultDataControlState & OptionsListBaseControlState;
export type OptionsListESQLControlState = ESQLControlState & OptionsListBaseControlState;

export type OptionsListControlState = OptionsListDataControlState | OptionsListESQLControlState;

export const isOptionsListESQLControlState = (
  state: OptionsListControlState
): state is OptionsListESQLControlState =>
  Object.hasOwn(state, 'esqlQuery') &&
  Object.hasOwn(state, 'controlType') &&
  !Object.hasOwn(state, 'fieldName');

/**
 * ----------------------------------------------------------------
 * Options list server request + response types
 * ----------------------------------------------------------------
 */

export type OptionsListSuggestions = Array<{
  value: OptionsListSelection;
  docCount?: number;
  key?: string; // For static values, this allows the value text to be changed and updated in the UI automatically
}>;

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
type OptionsListRequestBase = Omit<
  OptionsListRequestBody,
  'filters' | 'fieldName' | 'fieldSpec'
> & {
  timeRange?: TimeRange;
  dataView?: DataView;
  filters?: Filter[];
  field?: FieldSpec;
  query?: Query | AggregateQuery;
};

export type OptionsListDSLRequest = OptionsListRequestBase &
  Required<Pick<OptionsListRequestBase, 'dataView' | 'field'>>;

export type OptionsListESQLRequest = Omit<
  OptionsListRequestBase,
  'query' | 'size' | 'allowExpensiveQueries'
> & {
  query: AggregateQuery;
};

export type OptionsListRequest = OptionsListDSLRequest | OptionsListESQLRequest;

export const isOptionsListDSLRequest = (request: unknown): request is OptionsListDSLRequest => {
  const req = request as OptionsListDSLRequest;
  return Object.hasOwn(req, 'dataView') && Object.hasOwn(req, 'field');
};
export const isOptionsListESQLRequest = (request: unknown): request is OptionsListESQLRequest => {
  const req = request as OptionsListESQLRequest;
  return (
    !Object.hasOwn(req, 'dataView') &&
    !Object.hasOwn(req, 'field') &&
    Object.hasOwn(req, 'query') &&
    Object.hasOwn(req.query, 'esql')
  );
};

/**
 * The Options list request body is sent to the serverside Options List route and is used to create the ES query.
 */
export interface OptionsListRequestBody
  extends Pick<
    OptionsListControlState,
    'fieldName' | 'searchTechnique' | 'sort' | 'selectedOptions'
  > {
  runtimeFieldMap?: Record<string, RuntimeFieldSpec>;
  allowExpensiveQueries: boolean;
  ignoreValidations?: boolean;
  filters?: Array<{ bool: BoolQuery }>;
  runPastTimeout?: boolean;
  searchString?: string;
  fieldSpec?: FieldSpec;
  size: number;
}
