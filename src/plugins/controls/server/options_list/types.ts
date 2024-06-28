/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  OptionsListRequestBody,
  OptionsListParsedSuggestions,
} from '../../common/options_list/types';

export interface EsBucket {
  key: any;
  key_as_string?: string;
  doc_count: number;
}

export interface OptionsListValidationAggregationBuilder {
  buildAggregation: (req: OptionsListRequestBody) => unknown;
  parse: (response: SearchResponse, req: OptionsListRequestBody) => string[];
}

export interface OptionsListSuggestionAggregationBuilder {
  buildAggregation: (req: OptionsListRequestBody) => unknown;
  parse: (response: SearchResponse, req: OptionsListRequestBody) => OptionsListParsedSuggestions;
}
