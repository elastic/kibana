import { createAction } from 'redux-actions';
import lzString from 'lz-string';

export const historyRestore = createAction('HISTORY_RESTORE', persistedHistory => {
  if (!persistedHistory) return new Error(`Invalid history: ${persistedHistory}`);

  try {
    const payload = lzString.decompress(persistedHistory);
    return JSON.parse(payload);
  } catch (e) {
    return e;
  }
});

export const historyUndo = createAction('HISTORY_UNDO');
export const historyRedo = createAction('HISTORY_REDO');
