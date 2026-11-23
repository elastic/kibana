/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRecommendationSource } from './get_recommendation_source';

describe('getRecommendationSource', () => {
  it('keeps the current source when local data exists', () => {
    expect(
      getRecommendationSource({
        currentTitle: 'logs-*',
        hasLocalESData: true,
        datasetNames: ['btc_blocks'],
      })
    ).toBe('logs-*');
  });

  it('uses the federated dataset when the current source has no local data', () => {
    expect(
      getRecommendationSource({
        currentTitle: 'logs-*',
        hasLocalESData: false,
        datasetNames: ['btc_blocks'],
      })
    ).toBe('btc_blocks');
  });

  it('keeps a source that is already the federated dataset', () => {
    expect(
      getRecommendationSource({
        currentTitle: '"btc_blocks"',
        hasLocalESData: false,
        datasetNames: ['btc_blocks'],
      })
    ).toBe('"btc_blocks"');
  });

  it('keeps the current source when there is no dataset', () => {
    expect(
      getRecommendationSource({
        currentTitle: 'logs-*',
        hasLocalESData: false,
        datasetNames: [],
      })
    ).toBe('logs-*');
  });
});
