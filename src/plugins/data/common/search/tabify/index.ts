/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
