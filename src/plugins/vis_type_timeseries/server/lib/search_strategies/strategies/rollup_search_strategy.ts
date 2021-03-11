/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getCapabilitiesForRollupIndices, IndexPatternsService } from '../../../../../data/server';
import {
  VisTypeTimeseriesRequest,
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';
import { AbstractSearchStrategy } from './abstract_search_strategy';
import { RollupSearchCapabilities } from '../capabilities/rollup_search_capabilities';
import { IndexPatternObject } from '../../../../common/types';

const getRollupIndices = (rollupData: { [key: string]: any }) => Object.keys(rollupData);
const isIndexPatternContainsWildcard = (indexPattern: string) => indexPattern.includes('*');
const isIndexPatternValid = (indexPattern: string) =>
  indexPattern && typeof indexPattern === 'string' && !isIndexPatternContainsWildcard(indexPattern);

export class RollupSearchStrategy extends AbstractSearchStrategy {
  async search(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesVisDataRequest,
    bodies: any[]
  ) {
    return super.search(requestContext, req, bodies, 'rollup');
  }

  async getRollupData(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    indexPattern: string
  ) {
    try {
      const { getRollupIndexCaps } = requestContext.core.elasticsearch.client.asCurrentUser.rollup;
      const { body } = await getRollupIndexCaps({
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
    indexPattern: string | IndexPatternObject
  ) {
    let isViable = false;
    let capabilities = null;

    const index = typeof indexPattern === 'string' ? indexPattern : indexPattern?.title ?? '';

    if (isIndexPatternValid(index)) {
      const rollupData = await this.getRollupData(requestContext, index);
      const rollupIndices = getRollupIndices(rollupData);

      isViable = rollupIndices.length === 1;

      if (isViable) {
        const [rollupIndex] = rollupIndices;
        const fieldsCapabilities = getCapabilitiesForRollupIndices(rollupData);

        capabilities = new RollupSearchCapabilities(req, fieldsCapabilities, rollupIndex);
      }
    }

    return {
      isViable,
      capabilities,
    };
  }

  async getFieldsForWildcard(
    indexPattern: string,
    indexPatternsService: IndexPatternsService,
    capabilities?: unknown
  ) {
    return super.getFieldsForWildcard(indexPattern, indexPatternsService, capabilities, {
      type: 'rollup',
      rollupIndex: indexPattern,
    });
  }
}
