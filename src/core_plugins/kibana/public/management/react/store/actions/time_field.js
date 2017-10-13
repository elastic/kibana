import { createAction } from 'redux-actions';

export const selectTimeField = createAction('SELECT_TIME_FIELD', timeField => ({ timeField }));
