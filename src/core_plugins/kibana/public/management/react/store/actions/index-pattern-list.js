import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';
import { SavedObjectsClient } from 'ui/saved_objects';
import { $http } from '../../globals';

export const fetchIndexPatterns = createThunk('FETCH_INDEX_PATTERNS',
  async ({ dispatch }) => {
    const client = new SavedObjectsClient($http);
    const indexPatterns = await client.find({
      type: 'index-pattern',
      fields: ['title'],
      perPage: 10000
    });

    const patterns = indexPatterns.savedObjects;
    dispatch(fetchedIndexPatterns(patterns));
  }
);

export const fetchedIndexPatterns = createAction('FETCHED_INDEX_PATTERNS', indexPatterns => ({ indexPatterns }));
export const setTransientTableId = createAction('SET_TRANSIENT_TABLE_ID', id => ({ id }));
