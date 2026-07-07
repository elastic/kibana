/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { BooleanRelation } from '@kbn/es-query';

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
          query: "Men's Accessories 1",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories 1",
        },
      },
      $state: {
        store: 'appState',
      },
    },
    {
      meta: {
        type: 'combined',
        relation: BooleanRelation.OR,
        params: [
          {
            meta: {
              index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'category.keyword',
              params: {
                query: "Men's Accessories 2",
              },
            },
            query: {
              match_phrase: {
                'category.keyword': "Men's Accessories 2",
              },
            },
            $state: {
              store: 'appState',
            },
          },
          {
            meta: {
              type: 'combined',
              relation: BooleanRelation.AND,
              params: [
                {
                  meta: {
                    index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
                    alias: null,
                    negate: false,
                    disabled: false,
                    type: 'phrase',
                    key: 'category.keyword',
                    params: {
                      query: "Men's Accessories 3",
                    },
                  },
                  query: {
                    match_phrase: {
                      'category.keyword': "Men's Accessories 3",
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
                      query: "Men's Accessories 4",
                    },
                  },
                  query: {
                    match_phrase: {
                      'category.keyword': "Men's Accessories 4",
                    },
                  },
                  $state: {
                    store: 'appState',
                  },
                },
              ],
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
                query: "Men's Accessories 5",
              },
            },
            query: {
              match_phrase: {
                'category.keyword': "Men's Accessories 5",
              },
            },
            $state: {
              store: 'appState',
            },
          },
        ],
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
          query: "Men's Accessories 6",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories 6",
        },
      },
      $state: {
        store: 'appState',
      },
    },
  ] as Filter[];

export const getFiltersMockOrHide = () =>
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
          query: "Men's Accessories 1",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories 1",
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
          query: "Men's Accessories 2",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories 2",
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
          query: "Men's Accessories 3",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories 3",
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
          query: "Men's Accessories 4",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories 4",
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
          query: "Men's Accessories 5",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories 5",
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
          query: "Men's Accessories 6",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories 6",
        },
      },
      $state: {
        store: 'appState',
      },
    },
  ] as Filter[];

export const getDataThatNeedsNormalized = () =>
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
          query: "Men's Accessories 1",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories 1",
        },
      },
      $state: {
        store: 'appState',
      },
    },
    {
      meta: {
        type: 'combined',
        params: [
          {
            meta: {
              index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'category.keyword',
              params: {
                query: "Men's Accessories 2",
              },
            },
            query: {
              match_phrase: {
                'category.keyword': "Men's Accessories 2",
              },
            },
            $state: {
              store: 'appState',
            },
          },
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
                  query: "Men's Accessories 3",
                },
              },
              query: {
                match_phrase: {
                  'category.keyword': "Men's Accessories 3",
                },
              },
              $state: {
                store: 'appState',
              },
            },
          ],
          {
            meta: {
              index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'category.keyword',
              params: {
                query: "Men's Accessories 5",
              },
            },
            query: {
              match_phrase: {
                'category.keyword': "Men's Accessories 5",
              },
            },
            $state: {
              store: 'appState',
            },
          },
        ],
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
          query: "Men's Accessories 6",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories 6",
        },
      },
      $state: {
        store: 'appState',
      },
    },
  ] as Filter[];

export const getDataAfterNormalized = () =>
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
          query: "Men's Accessories 1",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories 1",
        },
      },
      $state: {
        store: 'appState',
      },
    },
    {
      meta: {
        type: 'combined',
        params: [
          {
            meta: {
              index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'category.keyword',
              params: {
                query: "Men's Accessories 2",
              },
            },
            query: {
              match_phrase: {
                'category.keyword': "Men's Accessories 2",
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
                query: "Men's Accessories 3",
              },
            },
            query: {
              match_phrase: {
                'category.keyword': "Men's Accessories 3",
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
                query: "Men's Accessories 5",
              },
            },
            query: {
              match_phrase: {
                'category.keyword': "Men's Accessories 5",
              },
            },
            $state: {
              store: 'appState',
            },
          },
        ],
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
          query: "Men's Accessories 6",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories 6",
        },
      },
      $state: {
        store: 'appState',
      },
    },
  ] as Filter[];

export const getDataThatNeedNotNormalized = () =>
  [
    {
      meta: {
        type: 'combined',
        params: [
          {
            meta: {
              index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'category.keyword',
              params: {
                query: "Men's Accessories 2",
              },
            },
            query: {
              match_phrase: {
                'category.keyword': "Men's Accessories 2",
              },
            },
            $state: {
              store: 'appState',
            },
          },
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
                  query: "Men's Accessories 3",
                },
              },
              query: {
                match_phrase: {
                  'category.keyword': "Men's Accessories 3",
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
                  query: "Men's Accessories 4",
                },
              },
              query: {
                match_phrase: {
                  'category.keyword': "Men's Accessories 4",
                },
              },
              $state: {
                store: 'appState',
              },
            },
          ],
          {
            meta: {
              index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'category.keyword',
              params: {
                query: "Men's Accessories 5",
              },
            },
            query: {
              match_phrase: {
                'category.keyword': "Men's Accessories 5",
              },
            },
            $state: {
              store: 'appState',
            },
          },
        ],
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
          query: "Men's Accessories 6",
        },
      },
      query: {
        match_phrase: {
          'category.keyword': "Men's Accessories 6",
        },
      },
      $state: {
        store: 'appState',
      },
    },
  ] as Filter[];
