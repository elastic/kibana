/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, FILTERS } from '@kbn/es-query';

export const createGroupFilter = (selectedGroup: string, values?: string[] | null): Filter[] => {
  if (values != null && values.length > 0 && selectedGroup) {
    return values.reduce(
      (acc: Filter[], query) => [
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
                // this will give us an exact match for fields with multiple values
                // for example, match_phrase: 'a' will match ['a'] and ['a', 'b', 'c']
                // we want to match only what we've selected, exactly ['a']
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
    );
  }
  return [];
};

export const getNullGroupFilter = (selectedGroup: string): Filter[] => [
  {
    meta: {
      disabled: false,
      negate: true,
      alias: null,
      key: selectedGroup,
      // field: selectedGroup,
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
