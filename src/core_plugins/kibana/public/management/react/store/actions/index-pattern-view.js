import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';
import { IndexPatternsApiClientProvider } from 'ui/index_patterns';
import { $http, config, es, indexPatterns, kbnUrl, $rootScope } from '../../globals';

export const fetchIndexPattern = createThunk('FETCH_INDEX_PATTERN',
  async ({ dispatch }, pattern) => {
    const client = new IndexPatternsApiClientProvider($http);
    const rawIndexPattern = await es.search({
      index: '.kibana',
      body: {
        query: {
          bool: {
            must: [
              {
                match: {
                  type: 'index-pattern',
                },
              },
              {
                match: {
                  'index-pattern.title': pattern,
                }
              }
            ]
          }
        }
      }
    });
    const hits = rawIndexPattern.hits.hits;
    if (hits.length !== 1) {
      throw 'Index pattern query did not match 1 index pattern. This is just debug for now';
    }
    const { _id, _source: source } = hits[0];
    const id = _id.replace('index-pattern:', '');
    const details = source['index-pattern'];
    const timeFieldName = details.timeFieldName;
    const fields = details.fields ? JSON.parse(details.fields) : [];
    const isDefault = id === config.get('defaultIndex');
    const indexPattern = {
      pattern,
      fields,
      timeFieldName,
      isDefault,
      id,
    };
    dispatch(fetchedIndexPattern(indexPattern));
  }
);

export const deleteIndexPattern = createThunk('DELETE_INDEX_PATTERN',
  async ({ dispatch }, id) => {
    const indexPattern = await indexPatterns.get(id);
    await indexPattern.destroy();
    kbnUrl.change('/management/kibana/indices');
    $rootScope.$apply();
  }
);

export const refreshFields = createThunk('REFRESH_FIELDS',
  async ({ dispatch }, id, pattern) => {
    const indexPattern = await indexPatterns.get(id);
    await indexPattern.refreshFields();
    dispatch(fetchIndexPattern(pattern))
  }
);

export const setDefaultIndexPattern = createThunk('SET_DEFAULT_INDEX_PATTERN',
  async ({ dispatch }, id) => {
    config.set('defaultIndex', id);
    dispatch(setAsDefaultIndexPattern());
  }
);

export const setAsDefaultIndexPattern = createAction('SET_AS_DEFAULT_INDEX_PATTERN');
export const fetchedIndexPattern = createAction('FETCHED_INDEX_PATTERN', indexPattern => ({ indexPattern }));
