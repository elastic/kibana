/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import { mapFilter } from '@kbn/data-plugin/public/query/filter_manager/lib/map_filter';

export const getFilterMock = () => [
  mapFilter({
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
  } as Filter),
];

export const getFilterMockOrConditional = () => ({
  meta: {
    type: 'combined',
    params: [
      mapFilter({
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
      } as Filter),
      mapFilter({
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
      } as Filter),
      mapFilter({
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
      } as Filter),
    ],
  },
});
