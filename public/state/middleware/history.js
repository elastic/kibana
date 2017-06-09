import { isEqual } from 'lodash';
import { historyProvider } from '../../lib/history_provider';
import * as historyActions from '../actions/history';

export const historyMiddleware = (win) => {
  const history = historyProvider(win);

  return ({ dispatch, getState }) => {
    history.setOnChange((historyState) => {
      if (historyState) return dispatch(historyActions.restoreHistory({ historyState }));
    });

    return next => (action) => {
      const oldState = getState();

      // deal with history actions
      if (action.type === 'HISTORY_UNDO') return history.undo();
      if (action.type === 'HISTORY_REDO') return history.redo();

      for (const action in historyActions) {
        if (action.toString() === action.type) {
          return next(action);
        }
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
