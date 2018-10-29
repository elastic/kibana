/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchRequest, SearchResult } from '../../model';

export interface SearchClient {
  search(req: SearchRequest): Promise<SearchResult>;
}
