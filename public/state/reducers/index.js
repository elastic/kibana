import { combineReducers } from 'redux';
import reduceReducers from 'reduce-reducers';
import { get } from 'lodash';

import { appReducer } from './app';
import { transientReducer } from './transient';
import { resolvedArgsReducer } from './resolved_args';
import { workpadReducer } from './workpad';
import { pagesReducer } from './pages';
import { elementsReducer } from './elements';
import { assetsReducer } from './assets';
import { historyReducer } from './history';

export function getRootReducer(initialState) {
  return combineReducers({
    assets: assetsReducer,
    app: appReducer,
    transient: reduceReducers(transientReducer, resolvedArgsReducer),
    persistent: reduceReducers(
      historyReducer,
      combineReducers({
        workpad: reduceReducers(workpadReducer, pagesReducer, elementsReducer),
        schemaVersion: (state = get(initialState, 'persistent.schemaVersion')) => state,
      })
    ),
  });
}
