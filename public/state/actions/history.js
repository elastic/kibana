import { createAction } from 'redux-actions';

export const undoHistory = createAction('undoHistory');
export const redoHistory = createAction('redoHistory');
export const restoreHistory = createAction('restoreHistory');
