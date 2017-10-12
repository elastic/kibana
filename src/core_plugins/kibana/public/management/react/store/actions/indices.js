import { globals } from '../../globals';
import { endsWith, startsWith, uniq, sortBy } from 'lodash';
import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';

import { fetchTimeFields } from './time_fields';

export const fetchedIndices = createAction('FETCHED_INDICES',
  (indices, pattern, hasExactMatches) => ({ indices, pattern, hasExactMatches }));

export const fetchIndices = createThunk('FETCH_INDICES',
  async ({ dispatch }, pattern, initialFetch = false) => {
    let partialPattern = pattern;
    if (!endsWith(partialPattern, '*')) {
      partialPattern = `${partialPattern}*`;
    }
    if (!startsWith(partialPattern, '*')) {
      partialPattern = `*${partialPattern}`;
    }

    const exactIndices = await getIndices(pattern);
    const partialIndices = await getIndices(partialPattern);
    const indices = uniq(exactIndices.concat(partialIndices), item => item.name);
    const hasExactMatches = !initialFetch && exactIndices.length > 0;
    dispatch(fetchedIndices(indices, pattern, hasExactMatches));

    if (hasExactMatches) {
      dispatch(fetchTimeFields(pattern));
    }
  }
);

const MAX_NUMBER_OF_MATCHING_INDICES = 200;
// TODO: probably move this to a lib
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

  const response = await globals.es.search(params);
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
