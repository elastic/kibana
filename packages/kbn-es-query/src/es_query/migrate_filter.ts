/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, omit, pick, cloneDeep } from 'lodash';
import { getConvertedValueForField } from '../filters';
import { Filter } from '../filters';
import { DataViewBase } from './types';

/** @internal */
export interface DeprecatedMatchPhraseFilter extends Filter {
  match: {
    [field: string]: {
      query: any;
      type: 'phrase';
    };
  };
}

function isDeprecatedMatchPhraseFilter(filter: Filter): filter is DeprecatedMatchPhraseFilter {
  // @ts-ignore
  const fieldName = Object.keys((filter.match || filter.query?.match) ?? {})[0];
  return Boolean(
    fieldName &&
      (get(filter, ['query', 'match', fieldName, 'type']) === 'phrase' ||
        get(filter, ['match', fieldName, 'type']) === 'phrase')
  );
}

/** @internal */
export function migrateFilter(filter: Filter, indexPattern?: DataViewBase) {
  if (isDeprecatedMatchPhraseFilter(filter)) {
    // @ts-ignore
    const match = filter.match || filter.query.match;
    const fieldName = Object.keys(match)[0];
    const params: Record<string, any> = get(match, [fieldName]);
    let query = params.query;
    if (indexPattern) {
      const field = indexPattern.fields.find((f) => f.name === fieldName);

      if (field) {
        query = getConvertedValueForField(field, params.query);
      }
    }
    return {
      meta: filter.meta,
      $state: filter.$state,
      query: {
        match_phrase: {
          [fieldName]: omit(
            {
              ...params,
              query,
            },
            'type'
          ),
        },
      },
    };
  }

  let migratedFilter = cloneDeep(filter);
  if (!migratedFilter.query) {
    migratedFilter.query = {};
  } else {
    // handle the case where .query already exists and filter has other top level keys on there
    migratedFilter = pick(migratedFilter, ['meta', 'query', '$state']);
  }

  // @ts-ignore
  if (migratedFilter.exists) {
    // @ts-ignore
    migratedFilter.query.exists = migratedFilter.exists;
    // @ts-ignore
    delete migratedFilter.exists;
  }

  // @ts-ignore
  if (migratedFilter.range) {
    // @ts-ignore
    migratedFilter.query.range = migratedFilter.range;
    // @ts-ignore
    delete migratedFilter.range;
  }

  // @ts-ignore
  if (migratedFilter.match_all) {
    // @ts-ignore
    migratedFilter.query.match_all = migratedFilter.match_all;
    // @ts-ignore
    delete migratedFilter.match_all;
  }

  // move all other keys under query
  Object.keys(migratedFilter).forEach((key) => {
    if (key === 'meta' || key === 'query' || key === '$state') {
      return;
    }
    // @ts-ignore
    migratedFilter.query[key] = mutableFilter[key];
    // @ts-ignore
    delete migratedFilter[key];
  });

  return migratedFilter;
}
