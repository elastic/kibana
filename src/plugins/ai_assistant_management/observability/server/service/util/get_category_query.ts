/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function getCategoryQuery({ contexts }: { contexts?: string[] }) {
  const noCategoryFilter = {
    bool: {
      must_not: {
        exists: {
          field: 'labels.category',
        },
      },
    },
  };

  if (!contexts) {
    return [noCategoryFilter];
  }

  return [
    {
      bool: {
        should: [
          noCategoryFilter,
          {
            terms: {
              'labels.category': contexts,
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
  ];
}
