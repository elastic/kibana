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
        index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        alias: null,
        negate: false,
        disabled: false,
        type: 'phrase',
        key: 'category.keyword',
        params: {
          query: "Men's Accessories",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories",
        },
      },
      $state: {
        store: 'appState',
      },
    },
    {
      meta: {
        params: {
          conditionalType: 'or',
          filters: [
            {
              meta: {
                index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
                alias: null,
                negate: false,
                disabled: false,
                type: 'phrase',
                key: 'category.keyword',
                params: {
                  query: "Men's Accessories",
                },
              },
              query: {
                match_phrase: {
                  'category.keyword': "Men's Accessories",
                },
              },
              $state: {
                store: 'appState',
              },
            },
            {
              meta: {
                params: {
                  conditionalType: 'and',
                  filters: [
                    {
                      meta: {
                        index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
                        alias: null,
                        negate: false,
                        disabled: false,
                        type: 'phrase',
                        key: 'category.keyword',
                        params: {
                          query: "Men's Accessories",
                        },
                      },
                      query: {
                        match_phrase: {
                          'category.keyword': "Men's Accessories",
                        },
                      },
                      $state: {
                        store: 'appState',
                      },
                    },
                    {
                      meta: {
                        index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
                        alias: null,
                        negate: false,
                        disabled: false,
                        type: 'phrase',
                        key: 'category.keyword',
                        params: {
                          query: "Men's Accessories",
                        },
                      },
                      query: {
                        match_phrase: {
                          'category.keyword': "Men's Accessories",
                        },
                      },
                      $state: {
                        store: 'appState',
                      },
                    },
                  ],
                },
              },
            },
            {
              meta: {
                index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
                alias: null,
                negate: false,
                disabled: false,
                type: 'phrase',
                key: 'category.keyword',
                params: {
                  query: "Men's Accessories",
                },
              },
              query: {
                match_phrase: {
                  'category.keyword': "Men's Accessories",
                },
              },
              $state: {
                store: 'appState',
              },
            },
          ],
        },
      },
    },
    {
      meta: {
        index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        alias: null,
        negate: false,
        disabled: false,
        type: 'phrase',
        key: 'category.keyword',
        params: {
          query: "Men's Accessories",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories",
        },
      },
      $state: {
        store: 'appState',
      },
    },
  ] as Filter[];
