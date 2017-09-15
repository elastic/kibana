import { isEqual } from 'lodash';
import { historyProvider } from '../../lib/history_provider';
import { restoreHistory, undoHistory, redoHistory } from '../actions/history';
import { initializeWorkpad } from '../actions/workpad.js';

export const historyMiddleware = (win) => {
  const history = historyProvider(win);

  return ({ dispatch, getState }) => {
    // wire up history change handler (this only happens once)
    history.setOnChange((historyState) => {
      if (historyState) return dispatch(restoreHistory(historyState));
    });

    return next => (action) => {
      const oldState = getState();

      // deal with history actions
      switch (action.type) {
        case undoHistory.toString():
          return history.undo();
        case redoHistory.toString():
          return history.redo();
        case restoreHistory.toString():
          // skip state compare, simply execute the action
          next(action);
          // TODO: we shouldn't need to reset the entire workpad for undo/redo
          dispatch(initializeWorkpad());
          return;
      }

      // execute the action like normal
      next(action);

      // if the persistent state changed, push it into the history
      const newState = getState();
      if (!isEqual(newState.persistent, oldState.persistent)) {
        history.push(newState.persistent);
      }
    };
  };
};
