import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import thunkMiddleware from 'redux-thunk';
import persistState from 'redux-localstorage';
import reduceReducers from 'reduce-reducers';
import { uiModules } from 'ui/modules';
import getInitialState from './initial_state';
import transientReducer from './reducers/transient';
import resolvedArgsReducer from './reducers/resolved_args';
import appReducer from './reducers/app';
import workpadReducer from './reducers/workpad';
import pagesReducer from './reducers/pages';
import elementsReducer from './reducers/elements';

const app = uiModules.get('apps/canvas');

app.service('$store', (kbnVersion, basePath) => {
  const storageKey = 'canvas';
  const initialState = getInitialState();

  // Set the defaults from Kibana plugin
  initialState.app = {
    kbnVersion,
    basePath,
  };

  const rootReducer = combineReducers({
    app: (state = initialState.app) => state,
    transient: reduceReducers(transientReducer, resolvedArgsReducer, appReducer),
    persistent: combineReducers({
      workpad: reduceReducers(workpadReducer, pagesReducer, elementsReducer),
    }),
  });

  const middleware = compose(
    applyMiddleware(thunkMiddleware),
    persistState('persistent', { key: storageKey })
  );
  const store = createStore(rootReducer, initialState, middleware);

  // TODO: Sticking this here so I can dispatch events from the console;
  window.store = store;

  return store;
});
