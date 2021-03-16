/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbstractSearchStrategy } from './abstract_search_strategy';
import { DefaultSearchCapabilities } from '../capabilities/default_search_capabilities';
import { VisTypeTimeseriesRequestHandlerContext, VisTypeTimeseriesRequest } from '../../../types';
import { IndexPatternsService } from '../../../../../data/server';
import { CachedIndexPatternFetcher } from '../lib/cached_index_pattern_fetcher';

export class DefaultSearchStrategy extends AbstractSearchStrategy {
  checkForViability(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesRequest
  ) {
    return Promise.resolve({
      isViable: true,
      capabilities: new DefaultSearchCapabilities(req),
    });
  }

  async getFieldsForWildcard(
    indexPattern: string,
    indexPatternsService: IndexPatternsService,
    getCachedIndexPatternFetcher: CachedIndexPatternFetcher,
    capabilities?: unknown
  ) {
    return super.getFieldsForWildcard(
      indexPattern,
      indexPatternsService,
      getCachedIndexPatternFetcher,
      capabilities
    );
  }
}
