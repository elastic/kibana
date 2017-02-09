import { isEqual } from 'lodash';
import lzString from 'lz-string';
import { historyUndo, historyRedo } from '../actions/history';
import stateHistory from '../lib/state_history';

const wh = window.history;

const historyReducer = reducer => (state, action) => {
  let newState = { ...state };

  switch (action.type) {
    case 'HISTORY_UNDO':
      wh.back();
      break;

    case 'HISTORY_REDO':
      wh.forward();
      break;

    case 'HISTORY_RESTORE':
      if (action.error) {
        // TODO: handle history restore error
        console.log('history restore failed', action.payload);
        return state;
      }

      return {
        ...state,
        persistent: action.payload,
      };

    default:
      newState = reducer(state, action);
      if (!isEqual(state.persistent, newState.persistent)) {
        try {
          const stateJSON = JSON.stringify(newState.persistent);
          const payload = lzString.compress(stateJSON);
          wh.pushState(payload, '');
        } catch (e) {
          // TODO: handle state saving errors
          console.log('pushstate failed', e);
        }
      }
  }

  return newState;
};

export default historyReducer;