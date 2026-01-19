/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  OptionsListControlState,
  OptionsListDSLControlState,
  OptionsListESQLControlState,
  OptionsListSelection,
} from '@kbn/controls-schemas';
import type { DataView, FieldSpec, RuntimeFieldSpec } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, BoolQuery, Filter, Query, TimeRange } from '@kbn/es-query';

/**
 * ----------------------------------------------------------------
 * Options list state types
 * ----------------------------------------------------------------
 */

export const isOptionsListESQLControlState = (
  state: OptionsListControlState | undefined
): state is OptionsListESQLControlState =>
  typeof state !== 'undefined' &&
  Object.hasOwn(state, 'esqlQuery') &&
  Object.hasOwn(state, 'controlType') &&
  !Object.hasOwn(state, 'fieldName');

/**
 * ----------------------------------------------------------------
 * Options list server request + response types
 * ----------------------------------------------------------------
 */

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
  query?: Query | AggregateQuery;
};

/**
 * The Options list request body is sent to the serverside Options List route and is used to create the ES query.
 */
export interface OptionsListRequestBody {
  fieldName: OptionsListDSLControlState['field_name'];
  searchTechnique?: OptionsListDSLControlState['search_technique'];
  sort?: OptionsListDSLControlState['sort'];
  selectedOptions?: OptionsListDSLControlState['selected_options'];

  runtimeFieldMap?: Record<string, RuntimeFieldSpec>;
  allowExpensiveQueries: boolean;
  ignoreValidations?: boolean;
  filters?: Array<{ bool: BoolQuery }>;
  runPastTimeout?: boolean;
  searchString?: string;
  fieldSpec?: FieldSpec;
  size: number;
  isReload?: boolean;
}
