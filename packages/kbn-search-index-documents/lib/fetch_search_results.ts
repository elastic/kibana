/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { DEFAULT_DOCS_PER_PAGE, Paginate } from '../types';
import { escapeLuceneChars } from '../utils/escape_lucene_charts';
import { fetchWithPagination } from '../utils/fetch_with_pagination';

export const fetchSearchResults = async (
  client: ElasticsearchClient,
  indexName: string,
  query?: string,
  from: number = 0,
  size: number = DEFAULT_DOCS_PER_PAGE,
  trackTotalHits: boolean = false
): Promise<Paginate<SearchHit>> => {
  const result = await fetchWithPagination(
    async () =>
      await client.search({
        from,
        index: indexName,
        size,
        ...(!!query ? { q: escapeLuceneChars(query) } : {}),
        track_total_hits: trackTotalHits,
      }),
    from,
    size
  );
  return {
    ...result,
    data: result.data,
  };
};
