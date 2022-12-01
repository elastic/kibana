/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';
import { BoolQuery } from '@kbn/es-query';

export interface TermsExplorerRequest {
  collapseFieldName: string;
  columns?: { [key: string]: FieldSpec };
  filters?: Array<{ bool: BoolQuery }>;
  from?: number;
  size?: number;
  sortDirection?: 'asc' | 'desc';
}

export type TermsExplorerResponseColumn =
  | TermsExplorerNumericColumnResult
  | TermsExplorerCardinalityColumnResult
  | TermsExplorerSingleStringColumnResult;

export interface TermsExplorerNumericColumnResult {
  result_type: 'numeric_aggregation';
  result: number;
}
export interface TermsExplorerCardinalityColumnResult {
  result_type: 'string_cardinality';
  result: number;
}

export interface TermsExplorerSingleStringColumnResult {
  result_type: 'string_value';
  result: string;
}

export interface TermsExplorerResponse {
  rows: Array<{ [key: string]: TermsExplorerResponseColumn }>;
}
