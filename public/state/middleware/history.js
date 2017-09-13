import { isEqual } from 'lodash';
import { historyProvider } from '../../lib/history_provider';
import { restoreHistory, undoHistory, redoHistory } from '../actions/history';

export const historyMiddleware = (win) => {
  const history = historyProvider(win);

  return ({ dispatch, getState }) => {
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
          return next(action);
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
