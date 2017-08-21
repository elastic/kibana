/* eslint-disable */
import { es, indexPatterns } from '../globals';
import { sortBy, endsWith, startsWith } from 'lodash';

const MAX_NUMBER_OF_MATCHING_INDICES = 500;

async function getIndices(pattern, limit = MAX_NUMBER_OF_MATCHING_INDICES) {
  const params = {
    index: pattern,
    ignore: [404],
    body: {
      size: 0, // no hits
      aggs: {
        indices: {
          terms: {
            field: '_index',
            size: limit,
          }
        }
      }
    }
  };

  const response = await es.search(params);
  if (!response || response.error || !response.aggregations) {
    return [];
  }

  return sortBy(response.aggregations.indices.buckets.map(bucket => {
    return {
      name: bucket.key,
      count: bucket.doc_count,
    };
  }), 'name');
}

async function getTimeFields(pattern) {
  const fields = await indexPatterns.fieldsFetcher.fetchForWildcard(pattern);
  const dateFields = fields.filter(field => field.type === 'date');
  return [
    ...dateFields.map(field => ({
      text: field.name,
      value: field.name
    })),
    { value: undefined, text: '-----' },
    { value: undefined, text: 'I don\'t want to use the Time Filter.' },
  ];
}

export const FETCH_INDICES = 'FETCH_INDICES';
export const fetchIndices = (pattern) => {
  return async dispatch => {
    let partialPattern = pattern;
    if (!endsWith(partialPattern, '*')) {
      partialPattern = `${partialPattern}*`;
    }
    if (!startsWith(partialPattern, '*')) {
      partialPattern = `*${partialPattern}`;
    }

    const exactIndices = await getIndices(pattern);
    const partialIndices = await getIndices(partialPattern);
    const indices = exactIndices.concat(partialIndices);
    const hasExactMatches = exactIndices.length > 0;
    dispatch(fetchedIndices(indices, hasExactMatches));

    if (hasExactMatches) {
      const timeFields = await getTimeFields(pattern);
      dispatch(fetchedTimeFields(timeFields));
    }
  }
};

export const FETCHED_INDICES = 'FETCHED_INDICES';
export const fetchedIndices = (indices, hasExactMatches) => {
  return {
    type: FETCHED_INDICES,
    indices,
    hasExactMatches,
  };
};

export const FETCHED_TIME_FIELDS = 'FETCHED_TIME_FIELDS';
export const fetchedTimeFields = (timeFields) => {
  return {
    type: FETCHED_TIME_FIELDS,
    timeFields,
  }
};

export const INCLUDE_SYSTEM_INDICES = 'INCLUDE_SYSTEM_INDICES';
export const includeSystemIndices = () => {
  return {
    type: INCLUDE_SYSTEM_INDICES,
  };
};

export const EXCLUDE_SYSTEM_INDICES = 'EXCLUDE_SYSTEM_INDICES';
export const excludeSystemIndices = () => {
  return {
    type: EXCLUDE_SYSTEM_INDICES,
  };
};

export const GOTO_NEXT_PAGE = 'GOTO_NEXT_PAGE';
export const goToNextPage = () => {
  return {
    type: GOTO_NEXT_PAGE,
  }
};

export const GOTO_PREVIOUS_PAGE = 'GOTO_PREVIOUS_PAGE';
export const goToPreviousPage = () => {
  return {
    type: GOTO_PREVIOUS_PAGE,
  }
};

export const CHANGE_SORT = 'CHANGE_SORT';
export const changeSort = (sortBy, sortAsc = true) => {
  return {
    type: CHANGE_SORT,
    sortBy,
    sortAsc,
  }
}
