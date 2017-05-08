import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import throwawayReducer from './reducers/throwaway_reducer';
import getInitialState from './initial_state';
import { uiModules } from 'ui/modules';

const app = uiModules.get('apps/canvas');

app.service('$store', (kbnVersion, basePath) => {

  const initialState = getInitialState();
  // Set the defaults from Kibana plugin
  initialState.app = {
    kbnVersion,
    basePath,
  };

  const rootReducer = combineReducers({
    throwAway: throwawayReducer,
  });

  const store = createStore(rootReducer, initialState, applyMiddleware(thunk));

  // TODO: Sticking this here so I can dispatch events from the console;
  window.store = store;

  return store;
});
