/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';

import { getIpRangeQuery } from './ip_search';
import { isValidSearch } from './is_valid_search';
import { getDefaultSearchTechnique } from './suggestions_searching';
import type { OptionsListRequestBody } from './types';

type SearchFilterRequest = Pick<
  OptionsListRequestBody,
  'searchString' | 'searchTechnique' | 'fieldName' | 'fieldSpec'
>;

export const getEscapedWildcardQuery = (q: string = '') =>
  q.replace(/[?*]/g, (match) => `\\${match}`);

const getExactMatchFilter = ({
  searchString,
  fieldName,
  fieldSpec,
}: SearchFilterRequest): estypes.QueryDslQueryContainer | undefined => {
  if (!isValidSearch({ searchString, fieldType: fieldSpec?.type, searchTechnique: 'exact' })) {
    return undefined;
  }
  return {
    term: {
      [fieldName]: { value: searchString ?? '', case_insensitive: fieldSpec?.type === 'string' },
    },
  };
};

const getIpSearchFilter = ({
  searchString,
  fieldName,
}: SearchFilterRequest): estypes.QueryDslQueryContainer | undefined => {
  const { validSearch, rangeQuery } = getIpRangeQuery(searchString ?? '');
  if (!validSearch || !rangeQuery?.length) return undefined;
  return {
    bool: {
      minimum_should_match: 1,
      should: rangeQuery.map((range) =>
        'mask' in range
          ? { term: { [fieldName]: range.mask } }
          : { range: { [fieldName]: { gte: range.from, lte: range.to } } }
      ),
    },
  };
};

const getStringSearchFilter = ({
  searchString = '',
  searchTechnique,
  fieldName,
  fieldSpec,
}: SearchFilterRequest): estypes.QueryDslQueryContainer => {
  const technique = searchTechnique ?? getDefaultSearchTechnique(fieldSpec?.type ?? 'string');
  return {
    [technique as 'prefix' | 'wildcard']: {
      [fieldName]: {
        value:
          technique === 'wildcard' ? `*${getEscapedWildcardQuery(searchString)}*` : searchString,
        case_insensitive: true,
      },
    },
  };
};

/**
 * The query that keeps the documents which match the search string of an options list, for the
 * field type and search technique. Undefined when there is nothing to search or the search is not
 * valid for the type of the field.
 */
export const getOptionsListSearchFilter = (
  request: SearchFilterRequest
): estypes.QueryDslQueryContainer | undefined => {
  if (!request.searchString) return undefined;
  if (request.searchTechnique === 'exact') return getExactMatchFilter(request);
  switch (request.fieldSpec?.type) {
    case 'ip':
      return getIpSearchFilter(request);
    case 'string':
      return getStringSearchFilter(request);
    default:
      return getExactMatchFilter(request);
  }
};
