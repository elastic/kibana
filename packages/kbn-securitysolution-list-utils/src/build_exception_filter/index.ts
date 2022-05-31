/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chunk } from 'lodash/fp';

import {
  CreateExceptionListItemSchema,
  EntryExists,
  EntryMatch,
  EntryMatchAny,
  EntryNested,
  ExceptionListItemSchema,
  entriesExists,
  entriesMatch,
  entriesMatchAny,
  entriesNested,
  OsTypeArray,
  entriesMatchWildcard,
  EntryMatchWildcard,
  EntryList,
  entriesList,
} from '@kbn/securitysolution-io-ts-list-types';
import { Filter } from '@kbn/es-query';
import { ListClient } from '@kbn/lists-plugin/server';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { partition } from 'lodash';
import { hasLargeValueList } from '../has_large_value_list';

type NonListEntry = EntryMatch | EntryMatchAny | EntryNested | EntryExists | EntryMatchWildcard;
interface ExceptionListItemNonLargeList extends ExceptionListItemSchema {
  entries: NonListEntry[];
}

interface CreateExceptionListItemNonLargeList extends CreateExceptionListItemSchema {
  entries: NonListEntry[];
}

export type ExceptionItemSansLargeValueLists =
  | ExceptionListItemNonLargeList
  | CreateExceptionListItemNonLargeList;

export interface BooleanFilter {
  bool: estypes.QueryDslBoolQuery;
}

export interface NestedFilter {
  nested: estypes.QueryDslNestedQuery;
}

export const chunkExceptions = (
  exceptions: ExceptionItemSansLargeValueLists[],
  chunkSize: number
): ExceptionItemSansLargeValueLists[][] => {
  return chunk(chunkSize, exceptions);
};

/**
 * Transforms the os_type into a regular filter as if the user had created it
 * from the fields for the next state of transforms which will create the elastic filters
 * from it.
 *
 * Note: We use two types of fields, the "host.os.type" and "host.os.name.caseless"
 * The endpoint/endgame agent has been using "host.os.name.caseless" as the same value as the ECS
 * value of "host.os.type" where the auditbeat, winlogbeat, etc... (other agents) are all using
 * "host.os.type". In order to be compatible with both, I create an "OR" between these two data types
 * where if either has a match then we will exclude it as part of the match. This should also be
 * forwards compatible for endpoints/endgame agents when/if they upgrade to using "host.os.type"
 * rather than using "host.os.name.caseless" values.
 *
 * Also we create another "OR" from the osType names so that if there are multiples such as ['windows', 'linux']
 * this will exclude anything with either 'windows' or with 'linux'
 * @param osTypes The os_type array from the REST interface that is an array such as ['windows', 'linux']
 * @param entries The entries to join the OR's with before the elastic filter change out
 */
export const transformOsType = (
  osTypes: OsTypeArray,
  entries: NonListEntry[]
): NonListEntry[][] => {
  const hostTypeTransformed = osTypes.map<NonListEntry[]>((osType) => {
    return [
      { field: 'host.os.type', operator: 'included', type: 'match', value: osType },
      ...entries,
    ];
  });
  const caseLessTransformed = osTypes.map<NonListEntry[]>((osType) => {
    return [
      { field: 'host.os.name.caseless', operator: 'included', type: 'match', value: osType },
      ...entries,
    ];
  });
  return [...hostTypeTransformed, ...caseLessTransformed];
};

/**
 * This builds an exception item filter with the os type
 * @param osTypes The os_type array from the REST interface that is an array such as ['windows', 'linux']
 * @param entries The entries to join the OR's with before the elastic filter change out
 */
export const buildExceptionItemFilterWithOsType = (
  osTypes: OsTypeArray,
  entries: NonListEntry[]
): BooleanFilter[] => {
  const entriesWithOsTypes = transformOsType(osTypes, entries);
  return entriesWithOsTypes.map((entryWithOsType) => {
    return {
      bool: {
        filter: entryWithOsType.map((entry) => createInnerAndClauses(entry)),
      },
    };
  });
};

export const buildExceptionItemFilter = (
  exceptionItem: ExceptionItemSansLargeValueLists
): Array<BooleanFilter | NestedFilter> => {
  const { entries, os_types: osTypes } = exceptionItem;
  if (osTypes != null && osTypes.length > 0) {
    return buildExceptionItemFilterWithOsType(osTypes, entries);
  } else {
    if (entries.length === 1) {
      return [createInnerAndClauses(entries[0])];
    } else {
      return [
        {
          bool: {
            filter: entries.map((entry) => createInnerAndClauses(entry)),
          },
        },
      ];
    }
  }
};

export const createOrClauses = (
  exceptionItems: ExceptionItemSansLargeValueLists[]
): Array<BooleanFilter | NestedFilter> => {
  return exceptionItems.flatMap((exceptionItem) => buildExceptionItemFilter(exceptionItem));
};

export const filterOutLargeValueLists = async (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
  listClient: ListClient
) => {
  return exceptionItems.map(async (exceptionItem) => {
    const listEntries = exceptionItem.entries.filter((entry): entry is EntryList =>
      entriesList.is(entry)
    );
    exceptionItem.entries = await Promise.all(
      listEntries.filter(async (entry) => {
        const {
          list: { id },
        } = entry;
        const valueList = await listClient.findListItem({
          listId: id,
          perPage: 0,
          page: 0,
          filter: '',
          currentIndexPosition: 0,
        });
        // Limit for value list size to be put into the initial ES request
        if (valueList && valueList.total <= 500) {
          return entry;
        }
      })
    );
    return exceptionItem;
  });
};

export const buildExceptionFilter = ({
  lists,
  excludeExceptions,
  chunkSize,
  alias = null,
  listClient,
}: {
  lists: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
  excludeExceptions: boolean;
  chunkSize: number;
  alias: string | null;
  listClient?: ListClient;
}): Filter | undefined => {
  // Remove exception items with large value lists. These are evaluated
  // elsewhere for the moment being.

  const [exceptionsWithoutValueLists, valueListExceptions] = partition(
    lists,
    (item): item is ExceptionItemSansLargeValueLists => !hasLargeValueList(item.entries)
  );

  const smallValueListExceptions: Array<ExceptionListItemSchema | CreateExceptionListItemSchema> =
    [];
  if (listClient) {
    const filteredExceptions = filterOutLargeValueLists(valueListExceptions, listClient);
    smallValueListExceptions.push(filteredExceptions);
  }

  const exceptionFilter: Filter = {
    meta: {
      alias,
      disabled: false,
      negate: excludeExceptions,
    },
    query: {
      bool: {
        should: undefined,
      },
    },
  };

  if (exceptionsWithoutValueLists.length === 0) {
    return undefined;
  } else if (exceptionsWithoutValueLists.length <= chunkSize) {
    const clause = createOrClauses(exceptionsWithoutValueLists);
    exceptionFilter.query!.bool!.should = clause;
    return exceptionFilter;
  } else {
    const chunks = chunkExceptions(exceptionsWithoutValueLists, chunkSize);

    const filters = chunks.map((exceptionsChunk) => {
      const orClauses = createOrClauses(exceptionsChunk);

      return {
        meta: {
          alias: null,
          disabled: false,
          negate: false,
        },
        query: {
          bool: {
            should: orClauses,
          },
        },
      };
    });

    const clauses = filters.map<BooleanFilter>(({ query }) => query);

    return {
      meta: {
        alias,
        disabled: false,
        negate: excludeExceptions,
      },
      query: {
        bool: {
          should: clauses,
        },
      },
    };
  }
};

export const buildExclusionClause = (booleanFilter: BooleanFilter): BooleanFilter => {
  return {
    bool: {
      must_not: booleanFilter,
    },
  };
};

export const buildMatchClause = (entry: EntryMatch): BooleanFilter => {
  const { field, operator, value } = entry;
  const matchClause = {
    bool: {
      minimum_should_match: 1,
      should: [
        {
          match_phrase: {
            [field]: value,
          },
        },
      ],
    },
  };

  if (operator === 'excluded') {
    return buildExclusionClause(matchClause);
  } else {
    return matchClause;
  }
};

export const getBaseMatchAnyClause = (entry: EntryMatchAny): BooleanFilter => {
  const { field, value } = entry;

  if (value.length === 1) {
    return {
      bool: {
        minimum_should_match: 1,
        should: [
          {
            match_phrase: {
              [field]: value[0],
            },
          },
        ],
      },
    };
  }

  return {
    bool: {
      minimum_should_match: 1,
      should: value.map((val) => {
        return {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  [field]: val,
                },
              },
            ],
          },
        };
      }),
    },
  };
};

export const buildMatchAnyClause = (entry: EntryMatchAny): BooleanFilter => {
  const { operator } = entry;
  const matchAnyClause = getBaseMatchAnyClause(entry);

  if (operator === 'excluded') {
    return buildExclusionClause(matchAnyClause);
  } else {
    return matchAnyClause;
  }
};

export const buildMatchWildcardClause = (entry: EntryMatchWildcard): BooleanFilter => {
  const { field, operator, value } = entry;
  const wildcardClause = {
    bool: {
      filter: {
        wildcard: {
          [field]: value,
        },
      },
    },
  };

  if (operator === 'excluded') {
    return buildExclusionClause(wildcardClause);
  } else {
    return wildcardClause;
  }
};

export const buildExistsClause = (entry: EntryExists): BooleanFilter => {
  const { field, operator } = entry;
  const existsClause = {
    bool: {
      minimum_should_match: 1,
      should: [
        {
          exists: {
            field,
          },
        },
      ],
    },
  };

  if (operator === 'excluded') {
    return buildExclusionClause(existsClause);
  } else {
    return existsClause;
  }
};

const isBooleanFilter = (clause: object): clause is BooleanFilter => {
  const keys = Object.keys(clause);
  return keys.includes('bool') != null;
};

export const getBaseNestedClause = (
  entries: NonListEntry[],
  parentField: string
): BooleanFilter => {
  if (entries.length === 1) {
    const [singleNestedEntry] = entries;
    const innerClause = createInnerAndClauses(singleNestedEntry, parentField);
    return isBooleanFilter(innerClause) ? innerClause : { bool: {} };
  }

  return {
    bool: {
      filter: entries.map((nestedEntry) => createInnerAndClauses(nestedEntry, parentField)),
    },
  };
};

export const buildNestedClause = (entry: EntryNested): NestedFilter => {
  const { field, entries } = entry;

  const baseNestedClause = getBaseNestedClause(entries, field);

  return {
    nested: {
      path: field,
      query: baseNestedClause,
      score_mode: 'none',
    },
  };
};

export const createInnerAndClauses = (
  entry: NonListEntry,
  parent?: string
): BooleanFilter | NestedFilter => {
  const field = parent != null ? `${parent}.${entry.field}` : entry.field;
  if (entriesExists.is(entry)) {
    return buildExistsClause({ ...entry, field });
  } else if (entriesMatch.is(entry)) {
    return buildMatchClause({ ...entry, field });
  } else if (entriesMatchAny.is(entry)) {
    return buildMatchAnyClause({ ...entry, field });
  } else if (entriesMatchWildcard.is(entry)) {
    return buildMatchWildcardClause({ ...entry, field });
  } else if (entriesNested.is(entry)) {
    return buildNestedClause(entry);
  } else {
    throw new TypeError(`Unexpected exception entry: ${entry}`);
  }
};
