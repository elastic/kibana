import { createAction } from 'redux-actions';

export const historyUndo = createAction('HISTORY_UNDO');
export const historyRedo = createAction('HISTORY_REDO');
