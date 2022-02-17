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
} from '@kbn/securitysolution-io-ts-list-types';
import { Filter } from '@kbn/es-query';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { hasLargeValueList } from '../has_large_value_list';

type NonListEntry = EntryMatch | EntryMatchAny | EntryNested | EntryExists;
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

export const buildExceptionFilter = ({
  lists,
  excludeExceptions,
  chunkSize,
}: {
  lists: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
  excludeExceptions: boolean;
  chunkSize: number;
}): Filter | undefined => {
  // Remove exception items with large value lists. These are evaluated
  // elsewhere for the moment being.
  const exceptionsWithoutLargeValueLists = lists.filter(
    (item): item is ExceptionItemSansLargeValueLists => !hasLargeValueList(item.entries)
  );

  const exceptionFilter: Filter = {
    meta: {
      alias: null,
      disabled: false,
      negate: excludeExceptions,
    },
    query: {
      bool: {
        should: undefined,
      },
    },
  };

  if (exceptionsWithoutLargeValueLists.length === 0) {
    return undefined;
  } else if (exceptionsWithoutLargeValueLists.length <= chunkSize) {
    const clause = createOrClauses(exceptionsWithoutLargeValueLists);
    exceptionFilter.query!.bool!.should = clause;
    return exceptionFilter;
  } else {
    const chunks = chunkExceptions(exceptionsWithoutLargeValueLists, chunkSize);

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
        alias: null,
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
  if (entriesExists.is(entry)) {
    const field = parent != null ? `${parent}.${entry.field}` : entry.field;
    return buildExistsClause({ ...entry, field });
  } else if (entriesMatch.is(entry)) {
    const field = parent != null ? `${parent}.${entry.field}` : entry.field;
    return buildMatchClause({ ...entry, field });
  } else if (entriesMatchAny.is(entry)) {
    const field = parent != null ? `${parent}.${entry.field}` : entry.field;
    return buildMatchAnyClause({ ...entry, field });
  } else if (entriesNested.is(entry)) {
    return buildNestedClause(entry);
  } else {
    throw new TypeError(`Unexpected exception entry: ${entry}`);
  }
};
