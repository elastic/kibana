/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getCapabilitiesForRollupIndices } from '../../../../../../data/server';
import type { DataViewsService } from '../../../../../../data_views/common';
import { AbstractSearchStrategy, EsSearchRequest } from './abstract_search_strategy';
import { RollupSearchCapabilities } from '../capabilities/rollup_search_capabilities';

import type { FetchedIndexPattern, TrackedEsSearches } from '../../../../common/types';
import type { CachedIndexPatternFetcher } from '../lib/cached_index_pattern_fetcher';
import type {
  VisTypeTimeseriesRequest,
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';
import { UI_SETTINGS } from '../../../../common/constants';

const getRollupIndices = (rollupData: { [key: string]: any }) => Object.keys(rollupData);
const isIndexPatternContainsWildcard = (indexPattern: string) => indexPattern.includes('*');

export class RollupSearchStrategy extends AbstractSearchStrategy {
  async search(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesVisDataRequest,
    esRequests: EsSearchRequest[],
    trackedEsSearches?: TrackedEsSearches
  ) {
    return super.search(requestContext, req, esRequests, trackedEsSearches, 'rollup');
  }

  async getRollupData(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    indexPattern: string
  ) {
    try {
      const esClient = (await requestContext.core).elasticsearch.client;
      const body = await esClient.asCurrentUser.rollup.getRollupIndexCaps({
        index: indexPattern,
      });

      return body;
    } catch (e) {
      return {};
    }
  }

  async checkForViability(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesRequest,
    { indexPatternString, indexPattern }: FetchedIndexPattern
  ) {
    let isViable = false;
    let capabilities = null;

    if (
      indexPatternString &&
      ((!indexPattern && !isIndexPatternContainsWildcard(indexPatternString)) ||
        indexPattern?.type === 'rollup')
    ) {
      const rollupData = await this.getRollupData(requestContext, indexPatternString);
      const rollupIndices = getRollupIndices(rollupData);
      const uiSettings = requestContext.core.uiSettings.client;

      isViable = rollupIndices.length === 1;

      if (isViable) {
        const [rollupIndex] = rollupIndices;
        const fieldsCapabilities = getCapabilitiesForRollupIndices(rollupData);

        capabilities = new RollupSearchCapabilities(
          {
            maxBucketsLimit: await uiSettings.get(UI_SETTINGS.MAX_BUCKETS_SETTING),
            panel: req.body.panels ? req.body.panels[0] : null,
          },
          fieldsCapabilities,
          rollupIndex
        );
      }
    }

    return {
      isViable,
      capabilities,
    };
  }

  async getFieldsForWildcard(
    fetchedIndexPattern: FetchedIndexPattern,
    indexPatternsService: DataViewsService,
    getCachedIndexPatternFetcher: CachedIndexPatternFetcher,
    capabilities?: unknown
  ) {
    return super.getFieldsForWildcard(fetchedIndexPattern, indexPatternsService, capabilities, {
      type: 'rollup',
      rollupIndex: fetchedIndexPattern.indexPatternString,
    });
  }
}
