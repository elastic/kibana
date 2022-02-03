/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, omit } from 'lodash';
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

  if (!filter.query) {
    filter.query = {};
  }

  // @ts-ignore
  if (filter.exists) {
    // @ts-ignore
    filter.query.exists = filter.exists;
    // @ts-ignore
    delete filter.exists;
  }

  // @ts-ignore
  if (filter.range) {
    // @ts-ignore
    filter.query.range = filter.range;
    // @ts-ignore
    delete filter.range;
  }

  // @ts-ignore
  if (filter.match_all) {
    // @ts-ignore
    filter.query.match_all = filter.match_all;
    // @ts-ignore
    delete filter.match_all;
  }

  // move all other keys under query
  Object.keys(filter).forEach((key) => {
    if (key === 'meta' || key === 'query' || key === '$state') {
      return;
    }
    // @ts-ignore
    filter.query[key] = filter[key];
    // @ts-ignore
    delete filter[key];
  });

  return filter;
}
