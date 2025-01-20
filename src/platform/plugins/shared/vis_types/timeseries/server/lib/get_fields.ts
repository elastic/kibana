/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniqBy } from 'lodash';

import { Framework } from '../plugin';
import { VisTypeTimeseriesFieldsRequest, VisTypeTimeseriesRequestHandlerContext } from '../types';
import { getCachedIndexPatternFetcher } from './search_strategies/lib/cached_index_pattern_fetcher';

export async function getFields(
  requestContext: VisTypeTimeseriesRequestHandlerContext,
  request: VisTypeTimeseriesFieldsRequest,
  framework: Framework,
  indexPatternString: string
) {
  const indexPatternsService = await framework.getIndexPatternsService(requestContext);
  const cachedIndexPatternFetcher = getCachedIndexPatternFetcher(indexPatternsService);

  if (!indexPatternString) {
    const defaultIndexPattern = await indexPatternsService.getDefault();

    indexPatternString = defaultIndexPattern?.title ?? '';
  }

  const fetchedIndex = await cachedIndexPatternFetcher(indexPatternString);

  const { searchStrategy, capabilities } =
    (await framework.searchStrategyRegistry.getViableStrategy(
      requestContext,
      request,
      fetchedIndex
    ))!;

  const fields = await searchStrategy.getFieldsForWildcard(
    fetchedIndex,
    indexPatternsService,
    capabilities
  );

  return uniqBy(fields, (field) => field.name);
}
