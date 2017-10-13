import { globals } from '../../globals';
import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';

export const fetchedIndexPattern = createAction('FETCHED_INDEX_PATTERN',
  (pattern, fields, timeFieldName, isDefault, id) => ({ pattern, fields, timeFieldName, isDefault, id }));
export const fetchIndexPattern = createThunk('FETCH_INDEX_PATTERN',
  async ({ dispatch }, pattern) => {
    const rawIndexPattern = await globals.es.search({
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
    const isDefault = id === globals.config.get('defaultIndex');
    dispatch(fetchedIndexPattern(pattern, fields, timeFieldName, isDefault, id));
  }
);

export const deleteIndexPattern = createThunk('DELETE_INDEX_PATTERN',
  async ({ dispatch }, id) => {
    const indexPattern = await globals.indexPatterns.get(id);
    await indexPattern.destroy();
    globals.kbnUrl.change('/management/kibana/indices');
    globals.$rootScope.$apply();
  }
);

export const setAsDefaultIndexPattern = createAction('SET_AS_DEFAULT_INDEX_PATTERN');
export const setDefaultIndexPattern = createThunk('SET_DEFAULT_INDEX_PATTERN',
  async ({ dispatch }, id) => {
    globals.config.set('defaultIndex', id);
    dispatch(setAsDefaultIndexPattern());
  }
);

export const refreshFields = createThunk('REFRESH_FIELDS',
  async ({ dispatch }, id, pattern) => {
    const indexPattern = await globals.indexPatterns.get(id);
    await indexPattern.refreshFields();
    dispatch(fetchIndexPattern(pattern));
  }
);
