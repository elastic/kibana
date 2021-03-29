/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbstractSearchStrategy } from './abstract_search_strategy';
import { DefaultSearchCapabilities } from '../capabilities/default_search_capabilities';

import type { IndexPatternsService } from '../../../../../data/server';
import type { FetchedIndexPattern } from '../../../../common/types';
import type {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesRequest,
} from '../../../types';

export class DefaultSearchStrategy extends AbstractSearchStrategy {
  async checkForViability(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesRequest
  ) {
    return {
      isViable: true,
      capabilities: new DefaultSearchCapabilities(req),
    };
  }

  async getFieldsForWildcard(
    fetchedIndexPattern: FetchedIndexPattern,
    indexPatternsService: IndexPatternsService,
    capabilities?: unknown
  ) {
    return super.getFieldsForWildcard(fetchedIndexPattern, indexPatternsService, capabilities);
  }
}
