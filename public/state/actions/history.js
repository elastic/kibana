import { createAction } from 'redux-actions';
import lzString from 'lz-string';

export const historyRestore = createAction('HISTORY_RESTORE', persistedHistory => {
  const payload = lzString.decompress(persistedHistory);
  return JSON.parse(payload);
});

export const historyUndo = createAction('HISTORY_UNDO');
export const historyRedo = createAction('HISTORY_REDO');
