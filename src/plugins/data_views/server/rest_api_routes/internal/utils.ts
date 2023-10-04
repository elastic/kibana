/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { QueryDslQueryContainer } from '../../../common/types';

const excludeFrozenDsl = {
  bool: {
    must_not: [
      {
        terms: {
          _tier: ['data_frozen'],
        },
      },
    ],
  },
};

interface GetIndexFilterDslOptions {
  indexFilter?: QueryDslQueryContainer;
  excludeFrozen: boolean;
}

export const getIndexFilterDsl = ({
  indexFilter,
  excludeFrozen,
}: GetIndexFilterDslOptions): QueryDslQueryContainer | undefined => {
  if (!indexFilter) {
    return excludeFrozen ? excludeFrozenDsl : undefined;
  }

  return !excludeFrozen
    ? indexFilter
    : {
        bool: {
          must: [indexFilter, excludeFrozenDsl],
        },
      };
};
