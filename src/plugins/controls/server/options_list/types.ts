/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { OptionsListOption } from '../../common/options_list/options_list_options';
import {
  OptionsListParsedSuggestions,
  OptionsListRequestBody,
} from '../../common/options_list/types';

export interface EsBucket {
  key: OptionsListOption;
  key_as_string?: string;
  doc_count: number;
}

export interface OptionsListValidationAggregationBuilder {
  buildAggregation: (req: OptionsListRequestBody) => unknown;
  parse: (response: SearchResponse, req: OptionsListRequestBody) => OptionsListOption[];
}

export interface OptionsListSuggestionAggregationBuilder {
  buildAggregation: (req: OptionsListRequestBody) => unknown;
  parse: (response: SearchResponse, req: OptionsListRequestBody) => OptionsListParsedSuggestions;
}
