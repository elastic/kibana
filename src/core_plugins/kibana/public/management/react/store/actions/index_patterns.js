import { globals } from '../../globals';
import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';
import { SavedObjectsClient } from 'ui/saved_objects';

export const fetchedIndexPatterns = createAction('FETCHED_INDEX_PATTERNS', indexPatterns => ({ indexPatterns }));
export const fetchIndexPatterns = createThunk('FETCH_INDEX_PATTERNS',
  async ({ dispatch }) => {
    const client = new SavedObjectsClient(globals.$http);
    const indexPatterns = await client.find({
      type: 'index-pattern',
      fields: ['title'],
      perPage: 10000
    });

    const defaultIndexPattern = globals.config.get('defaultIndex');
    const patterns = indexPatterns.savedObjects.map(so => ({
      ...so,
      isDefault: defaultIndexPattern === so.id,
    }));
    dispatch(fetchedIndexPatterns(patterns));
  }
);
