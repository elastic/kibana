import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';
import { IndexPatternsApiClientProvider } from 'ui/index_patterns';
import { $http, config, es } from '../../globals';

export const fetchIndexPattern = createThunk('FETCH_INDEX_PATTERN',
  async ({ dispatch }, pattern) => {
    const client = new IndexPatternsApiClientProvider($http);
    // const fields = await client.getFieldsForWildcard({ pattern });
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
    const details = hits[0]._source['index-pattern'];
    const timeFieldName = details.timeFieldName;
    const fields = JSON.parse(details.fields);
    const indexPattern = {
      pattern,
      fields,
      timeFieldName,
    };
    dispatch(fetchedIndexPattern(indexPattern));
  }
);

export const fetchedIndexPattern = createAction('FETCHED_INDEX_PATTERN', indexPattern => ({ indexPattern }));
// export const setTransientTableId = createAction('SET_TRANSIENT_TABLE_ID', id => ({ id }));
