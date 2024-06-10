/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, FILTERS } from '@kbn/es-query';
export const getEmptyValue = () => '—';

type StrictFilter = Filter & {
  query: Record<string, any>;
};

export const createGroupFilter = (
  selectedGroup: string,
  values?: string[] | null
): StrictFilter[] =>
  values != null && values.length > 0
    ? values.reduce(
        (acc: StrictFilter[], query) => [
          ...acc,
          {
            meta: {
              alias: null,
              disabled: false,
              key: selectedGroup,
              negate: false,
              params: {
                query,
              },
              type: 'phrase',
            },
            query: {
              match_phrase: {
                [selectedGroup]: {
                  query,
                },
              },
            },
          },
        ],
        [
          {
            meta: {
              alias: null,
              disabled: false,
              type: FILTERS.CUSTOM,
              negate: false,
              key: selectedGroup,
            },
            query: {
              script: {
                script: {
                  // this will give us an exact match for events with multiple values on the group field
                  // for example, when values === ['a'], we match events with ['a'], but not ['a', 'b', 'c']
                  source: "doc[params['field']].size()==params['size']",
                  params: {
                    field: selectedGroup,
                    size: values.length,
                  },
                },
              },
            },
          },
        ]
      )
    : [];

export const getNullGroupFilter = (selectedGroup: string): StrictFilter[] => [
  {
    meta: {
      disabled: false,
      negate: true,
      alias: null,
      key: selectedGroup,
      value: 'exists',
      type: 'exists',
    },
    query: {
      exists: {
        field: selectedGroup,
      },
    },
  },
];
