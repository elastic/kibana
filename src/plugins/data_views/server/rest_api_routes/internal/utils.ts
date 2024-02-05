/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { QueryDslQueryContainer } from '../../../common/types';

const excludeTiersDsl = (excludedTiers: string) => {
  const _tier = excludedTiers.split(',').map((tier) => tier.trim());
  return {
    bool: {
      must_not: [
        {
          terms: {
            _tier,
          },
        },
      ],
    },
  };
};

interface GetIndexFilterDslOptions {
  indexFilter?: QueryDslQueryContainer;
  excludedTiers?: string;
}

export const getIndexFilterDsl = ({
  indexFilter,
  excludedTiers,
}: GetIndexFilterDslOptions): QueryDslQueryContainer | undefined => {
  if (!indexFilter) {
    return excludedTiers ? excludeTiersDsl(excludedTiers) : undefined;
  }

  return !excludedTiers
    ? indexFilter
    : {
        bool: {
          must: [indexFilter, excludeTiersDsl(excludedTiers)],
        },
      };
};
