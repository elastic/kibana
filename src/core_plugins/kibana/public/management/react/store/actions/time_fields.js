import { globals } from '../../globals';
import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';

export const fetchedTimeFields = createAction('FETCHED_TIME_FIELDS', timeFields => ({ timeFields }));
export const fetchTimeFields = createThunk('FETCH_TIME_FIELDS',
  async ({ dispatch }, pattern) => {
    const fields = await globals.indexPatterns.fieldsFetcher.fetchForWildcard(pattern);
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
