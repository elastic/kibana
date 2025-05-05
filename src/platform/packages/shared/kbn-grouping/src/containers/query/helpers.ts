/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';
import { MAX_RUNTIME_FIELD_SIZE } from '.';
export const getEmptyValue = () => '—';

export const checkIsFlattenResults = (groupByField: string, fields: string[] = []): boolean =>
  fields.includes(groupByField);

type StrictFilter = Filter & {
  query: Record<string, any>;
};

export const createGroupFilter = (
  selectedGroup: string,
  values?: string[] | null,
  multiValueFields?: string[]
): StrictFilter[] => {
  const shouldIgnoreFieldSize = checkIsFlattenResults(selectedGroup, multiValueFields);
  return values != null && values.length > 0
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
        shouldIgnoreFieldSize
          ? []
          : [
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
};

export const getNullGroupFilter = (selectedGroup: string): StrictFilter[] => [
  {
    meta: {
      disabled: false,
      negate: false,
      alias: null,
      key: selectedGroup,
      type: FILTERS.CUSTOM,
    },
    query: {
      // Matches documents where selectedGroup is missing or array length is greater than 100
      bool: {
        should: [
          {
            bool: {
              must_not: {
                exists: {
                  field: selectedGroup,
                },
              },
            },
          },
          {
            script: {
              script: {
                source: `doc['${selectedGroup}'].size() > ${MAX_RUNTIME_FIELD_SIZE}`,
                lang: 'painless',
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
  },
];
