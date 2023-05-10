/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const createGroupFilter = (selectedGroup: string, values?: string[] | null) => {
  console.log('values', { values, selectedGroup });
  return values != null && values.length > 0 && selectedGroup
    ? values.map((query) => ({
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
      }))
    : [];
};

export const getNullGroupFilter = (selectedGroup: string) => [
  {
    meta: {
      disabled: false,
      negate: true,
      alias: null,
      key: selectedGroup,
      field: selectedGroup,
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
