import { combineReducers } from 'redux';
import reduceReducers from 'reduce-reducers';
import { get } from 'lodash';

import transientReducer from './transient';
import resolvedArgsReducer from './resolved_args';
import appReducer from './app';
import workpadReducer from './workpad';
import pagesReducer from './pages';
import elementsReducer from './elements';
import historyReducer from './history';

export default function getRootReducer(initialState) {
  return combineReducers({
    app: (state = initialState.app) => state,
    transient: reduceReducers(transientReducer, resolvedArgsReducer, appReducer),
    persistent: combineReducers({
      workpad: reduceReducers(workpadReducer, pagesReducer, elementsReducer),
    }),
    persistent: reduceReducers(historyReducer, combineReducers({
      workpad: reduceReducers(workpadReducer, pagesReducer, elementsReducer),
      schemaVersion: (state = get(initialState, 'persistent.schemaVersion')) => state,
    })),
  });
}
