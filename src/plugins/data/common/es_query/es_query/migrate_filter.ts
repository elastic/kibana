/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get, omit } from 'lodash';
import { getConvertedValueForField } from '../filters';
import { Filter } from '../filters';
import { IIndexPattern } from '../../index_patterns';

export interface DeprecatedMatchPhraseFilter extends Filter {
  query: {
    match: {
      [field: string]: {
        query: any;
        type: 'phrase';
      };
    };
  };
}

function isDeprecatedMatchPhraseFilter(filter: any): filter is DeprecatedMatchPhraseFilter {
  const fieldName = filter.query && filter.query.match && Object.keys(filter.query.match)[0];

  return Boolean(fieldName && get(filter, ['query', 'match', fieldName, 'type']) === 'phrase');
}

export function migrateFilter(filter: Filter, indexPattern?: IIndexPattern) {
  if (isDeprecatedMatchPhraseFilter(filter)) {
    const fieldName = Object.keys(filter.query.match)[0];
    const params: Record<string, any> = get(filter, ['query', 'match', fieldName]);
    let query = params.query;
    if (indexPattern) {
      const field = indexPattern.fields.find((f) => f.name === fieldName);

      if (field) {
        query = getConvertedValueForField(field, params.query);
      }
    }
    return {
      ...filter,
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

  return filter;
}
