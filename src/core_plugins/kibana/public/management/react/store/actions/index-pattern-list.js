import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';
import { SavedObjectsClient } from 'ui/saved_objects';
import { $http, config } from '../../globals';

export const fetchIndexPatterns = createThunk('FETCH_INDEX_PATTERNS',
  async ({ dispatch }) => {
    const client = new SavedObjectsClient($http);
    const indexPatterns = await client.find({
      type: 'index-pattern',
      fields: ['title'],
      perPage: 10000
    });

    const defaultIndexPattern = config.get('defaultIndex');
    const patterns = indexPatterns.savedObjects.map(so => ({
      ...so,
      isDefault: defaultIndexPattern === so.id,
      // indices: Math.round(Math.random() * 100 + 1),
      // fields: Math.round(Math.random() * 100 + 1),
      // creator: 'Chris Roberson',
    }));
    dispatch(fetchedIndexPatterns(patterns));
  }
);

export const fetchedIndexPatterns = createAction('FETCHED_INDEX_PATTERNS', indexPatterns => ({ indexPatterns }));
export const change = createAction('CHANGE', (selectorPath, data) => ({ selectorPath, data }));
