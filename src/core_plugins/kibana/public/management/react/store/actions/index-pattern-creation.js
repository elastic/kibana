import { indexPatterns, es } from '../../globals';
import { sortBy, endsWith, startsWith, uniq } from 'lodash';
import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';

export const fetchTimeFields = createThunk('FETCH_TIME_FIELDS',
  async ({ dispatch }, pattern) => {
    const fields = await indexPatterns.fieldsFetcher.fetchForWildcard(pattern);
    const dateFields = fields.filter(field => field.type === 'date');
    const timeFields = [
      { value: '', text: 'None' },
      ...dateFields.map(field => ({
        text: field.name,
        value: field.name
      })),
    ];
    dispatch(fetchedTimeFields(timeFields));
  }
);

export const fetchedTimeFields = createAction('FETCHED_TIME_FIELDS', timeFields => ({ timeFields }));
export const selectTimeField = createAction('SELECT_TIME_FIELD', timeField => ({ timeField }));

export const goToNextPage = createAction('GOTO_NEXT_PAGE');
export const goToPreviousPage = createAction('GOTO_PREVIOUS_PAGE');
export const changeSort = createAction('CHANGE_SORT', (sortBy, sortAsc = true) => ({ sortBy, sortAsc }));

export const includeSystemIndices = createAction('INCLUDE_SYSTEM_INDICES');
export const excludeSystemIndices = createAction('EXCLUDE_SYSTEM_INDICES');

export const creatingIndexPattern = createAction('CREATING_INDEX_PATTERN');
export const createdIndexPattern = createAction('CREATED_INDEX_PATTERN');


export const fetchedIndices = createAction('FETCHED_INDICES',
  (indices, pattern, hasExactMatches) => ({ pattern, indices, hasExactMatches })
);

export const fetchIndices = createThunk('FETCH_INDICES',
  async ({ dispatch }, pattern) => {
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
    const hasExactMatches = exactIndices.length > 0;
    dispatch(fetchedIndices(indices, pattern, hasExactMatches));

    if (hasExactMatches) {
      fetchTimeFields(pattern)(dispatch);
    }
  }
);

export const createIndexPattern = createThunk('CREATE_INDEX_PATTERN',
  async ({ dispatch }, { pattern, timeFieldName }) => {
    dispatch(creatingIndexPattern);
    const indexPattern = await indexPatterns.get();
    Object.assign(indexPattern, {
      title: pattern,
      timeFieldName,
    });

    const createdId = await indexPattern.create();

    console.log('createIndexPattern()', createdId);

    if (!config.get('defaultIndex')) {
      config.set('defaultIndex', createdId);
    }

    indexPatterns.cache.clear(createdId);
    dispatch(createdIndexPattern);
    kbnUrl.change(`/management/kibana/indices/${createdId}`);
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
