import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import reduceReducers from 'reduce-reducers';
import { uiModules } from 'ui/modules';
import getInitialState from './initial_state';
import throwawayReducer from './reducers/throwaway_reducer';
import transientReducer from './reducers/transient';
import resolvedArgsReducer from './reducers/resolved_args';
import workpadReducer from './reducers/workpad';
import pagesReducer from './reducers/pages';
import elementsReducer from './reducers/elements';

const app = uiModules.get('apps/canvas');

app.service('$store', (kbnVersion, basePath) => {
  const initialState = getInitialState();

  // Set the defaults from Kibana plugin
  initialState.app = {
    kbnVersion,
    basePath,
  };

  const rootReducer = combineReducers({
    app: (state = initialState.app) => state,
    transient: reduceReducers(transientReducer, resolvedArgsReducer),
    persistent: combineReducers({
      workpad: reduceReducers(workpadReducer, pagesReducer, elementsReducer),
    }),
    throwAway: throwawayReducer,
  });

  const store = createStore(rootReducer, initialState, applyMiddleware(thunk));

  // TODO: Sticking this here so I can dispatch events from the console;
  window.store = store;

  return store;
});
