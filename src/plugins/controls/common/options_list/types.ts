/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Filter, Query, BoolQuery, TimeRange } from '@kbn/es-query';
import { FieldSpec, DataView } from '@kbn/data-views-plugin/common';

import { DataControlInput } from '../types';

export const OPTIONS_LIST_CONTROL = 'optionsListControl';

export interface OptionsListEmbeddableInput extends DataControlInput {
  selectedOptions?: string[];
  runPastTimeout?: boolean;
  singleSelect?: boolean;
}

export type OptionsListField = FieldSpec & {
  textFieldName?: string;
  parentFieldName?: string;
  childFieldName?: string;
};

/**
 * The Options list response is returned from the serverside Options List route.
 */
export interface OptionsListResponse {
  suggestions: string[];
  totalCardinality: number;
  invalidSelections?: string[];
}

/**
 * The Options list request type taken in by the public Options List service.
 */
export type OptionsListRequest = Omit<
  OptionsListRequestBody,
  'filters' | 'fieldName' | 'fieldSpec' | 'textFieldName'
> & {
  timeRange?: TimeRange;
  field: OptionsListField;
  runPastTimeout?: boolean;
  dataView: DataView;
  filters?: Filter[];
  query?: Query;
};

/**
 * The Options list request body is sent to the serverside Options List route and is used to create the ES query.
 */
export interface OptionsListRequestBody {
  filters?: Array<{ bool: BoolQuery }>;
  selectedOptions?: string[];
  runPastTimeout?: boolean;
  textFieldName?: string;
  searchString?: string;
  fieldSpec?: FieldSpec;
  fieldName: string;
}
