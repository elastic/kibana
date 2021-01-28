/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ReqFacade, AbstractSearchStrategy } from './abstract_search_strategy';
import { RollupSearchCapabilities } from '../capabilities/rollup_search_capabilities';
import type { VisPayload } from '../../../../common/types';

import { getCapabilitiesForRollupIndices } from '../../../../../data/server';

const getRollupIndices = (rollupData: { [key: string]: any }) => Object.keys(rollupData);
const isIndexPatternContainsWildcard = (indexPattern: string) => indexPattern.includes('*');
const isIndexPatternValid = (indexPattern: string) =>
  indexPattern && typeof indexPattern === 'string' && !isIndexPatternContainsWildcard(indexPattern);

export class RollupSearchStrategy extends AbstractSearchStrategy {
  async search(req: ReqFacade<VisPayload>, bodies: any[]) {
    return super.search(req, bodies, 'rollup');
  }

  async getRollupData(req: ReqFacade, indexPattern: string) {
    return req.requestContext.core.elasticsearch.client.asCurrentUser.rollup
      .getRollupIndexCaps({
        index: indexPattern,
      })
      .then((data) => data.body)
      .catch(() => Promise.resolve({}));
  }

  async checkForViability(req: ReqFacade<VisPayload>, indexPattern: string) {
    let isViable = false;
    let capabilities = null;

    if (isIndexPatternValid(indexPattern)) {
      const rollupData = await this.getRollupData(req, indexPattern);
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

  async getFieldsForWildcard<TPayload = unknown>(
    req: ReqFacade<TPayload>,
    indexPattern: string,
    capabilities?: unknown
  ) {
    return super.getFieldsForWildcard(req, indexPattern, capabilities, {
      type: 'rollup',
      rollupIndex: indexPattern,
    });
  }
}
