/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BoolQuery } from '@kbn/es-query';
import { FieldSpec } from '@kbn/data-views-plugin/common';
import { ControlInput } from '../../types';

export const OPTIONS_LIST_CONTROL = 'optionsListControl';

export interface OptionsListEmbeddableInput extends ControlInput {
  selectedOptions?: string[];
  singleSelect?: boolean;
  loading?: boolean;
}

export interface OptionsListResponse {
  suggestions: string[];
  totalCardinality: number;
  invalidSelections?: string[];
}

export interface OptionsListRequestBody {
  filters?: Array<{ bool: BoolQuery }>;
  selectedOptions?: string[];
  searchString?: string;
  fieldSpec?: FieldSpec;
  fieldName: string;
}
