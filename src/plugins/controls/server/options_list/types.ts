/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { OptionsListSelection } from '../../common/options_list/options_list_selections';
import {
  OptionsListParsedSuggestions,
  OptionsListRequestBody,
} from '../../common/options_list/types';

export interface EsBucket {
  key: OptionsListSelection;
  key_as_string?: string;
  doc_count: number;
}

export interface OptionsListValidationAggregationBuilder {
  buildAggregation: (req: OptionsListRequestBody) => unknown;
  parse: (response: SearchResponse, req: OptionsListRequestBody) => OptionsListSelection[];
}

export interface OptionsListSuggestionAggregationBuilder {
  buildAggregation: (req: OptionsListRequestBody) => unknown;
  parse: (response: SearchResponse, req: OptionsListRequestBody) => OptionsListParsedSuggestions;
}
