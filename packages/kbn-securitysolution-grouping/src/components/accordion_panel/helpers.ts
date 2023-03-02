/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const createGroupFilter = (selectedGroup: string, query?: string) =>
  query && selectedGroup
    ? [
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
      ]
    : [];
