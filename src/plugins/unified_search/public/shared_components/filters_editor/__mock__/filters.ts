/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Filter } from '@kbn/es-query';

export const getFiltersMock = () =>
  [
    {
      meta: {
        index: '1234',
        type: 'phrase',
        key: 'category.keyword',
        params: {
          query: 'Filter 1',
        },
      },
    },
    {
      meta: {
        params: {
          conditionalType: 'or',
          filters: [
            {
              meta: {
                index: '1234',
                type: 'phrase',
                key: 'category.keyword',
                params: {
                  query: 'Filter 2',
                },
              },
            },
            {
              meta: {
                params: {
                  conditionalType: 'and',
                  filters: [
                    {
                      meta: {
                        index: '1234',
                        type: 'phrase',
                        key: 'category.keyword',
                        params: {
                          query: 'Filter 2-1',
                        },
                      },
                    },
                    {
                      meta: {
                        index: '1234',
                        type: 'phrase',
                        key: 'category.keyword',
                        params: {
                          query: 'Filter 2-2',
                        },
                      },
                    },
                  ],
                },
              },
            },
            {
              meta: {
                index: '1234',
                type: 'phrase',
                key: 'category.keyword',
                params: {
                  query: 'Filter 3',
                },
              },
            },
          ],
        },
      },
    },
    {
      meta: {
        index: '1234',
        type: 'phrase',
        key: 'category.keyword',
        params: {
          query: 'Filter 4',
        },
      },
    },
  ] as Filter[];
