/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SearchResponse } from 'elasticsearch';
import { SearchSource } from '../search_source';
import { tabifyAggResponse } from './tabify';
import { tabifyDocs, TabifyDocsOptions } from './tabify_docs';
import { TabbedResponseWriterOptions } from './types';

export const tabify = (
  searchSource: SearchSource,
  esResponse: SearchResponse<unknown>,
  opts: Partial<TabbedResponseWriterOptions> | TabifyDocsOptions
) => {
  return !esResponse.aggregations
    ? tabifyDocs(esResponse, searchSource.getField('index'), opts as TabifyDocsOptions)
    : tabifyAggResponse(
        searchSource.getField('aggs'),
        esResponse,
        opts as Partial<TabbedResponseWriterOptions>
      );
};

export { tabifyAggResponse } from './tabify';
export { tabifyGetColumns } from './get_columns';

export { TabbedTable, TabbedAggRow, TabbedAggColumn } from './types';
