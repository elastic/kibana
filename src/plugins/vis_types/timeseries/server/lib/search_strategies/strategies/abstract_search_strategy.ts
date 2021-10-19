/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternsService } from '../../../../../../data/server';
import { toSanitizedFieldType } from '../../../../common/fields_utils';

import type { FetchedIndexPattern } from '../../../../common/types';
import type {
  VisTypeTimeseriesRequest,
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';

export abstract class AbstractSearchStrategy {
  async search(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesVisDataRequest,
    bodies: any[],
    indexType?: string
  ) {
    const requests: any[] = [];

    bodies.forEach((body) => {
      requests.push(
        requestContext.search
          .search(
            {
              indexType,
              params: {
                ...body,
              },
            },
            req.body.searchSession
          )
          .toPromise()
      );
    });
    return Promise.all(requests);
  }

  checkForViability(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesRequest,
    fetchedIndexPattern: FetchedIndexPattern
  ): Promise<{ isViable: boolean; capabilities: any }> {
    throw new TypeError('Must override method');
  }

  async getFieldsForWildcard(
    fetchedIndexPattern: FetchedIndexPattern,
    indexPatternsService: IndexPatternsService,
    capabilities?: unknown,
    options?: Partial<{
      type: string;
      rollupIndex: string;
    }>
  ) {
    return toSanitizedFieldType(
      fetchedIndexPattern.indexPattern
        ? fetchedIndexPattern.indexPattern.getNonScriptedFields()
        : await indexPatternsService.getFieldsForWildcard({
            pattern: fetchedIndexPattern.indexPatternString ?? '',
            metaFields: [],
            ...options,
          })
    );
  }
}
