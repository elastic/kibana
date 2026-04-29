/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getIndexFilterDsl } from './utils';

describe('getIndexFilterDsl', () => {
  const indexFilter = { term: { _id: '1' } };
  const tiersQuery = {
    bool: {
      must_not: [
        {
          terms: {
            _tier: ['data_cold', 'data_frozen'],
          },
        },
      ],
    },
  };
  const excludedTiers = 'data_cold, data_frozen';

  it('no indexFilter, no excluded tiers', () => {
    expect(getIndexFilterDsl({})).toBeUndefined();
  });

  it('indexFilter, no excluded tiers', () => {
    expect(getIndexFilterDsl({ indexFilter })).toEqual(indexFilter);
  });

  it('excluded tiers, no indexFilter', () => {
    expect(getIndexFilterDsl({ excludedTiers })).toEqual(tiersQuery);
  });

  it('indexFilter and excluded tiers', () => {
    const combinedQuery = {
      bool: {
        must: [indexFilter, tiersQuery],
      },
    };

    expect(getIndexFilterDsl({ indexFilter, excludedTiers })).toEqual(combinedQuery);
  });
});
