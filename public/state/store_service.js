import { createStore } from 'redux';
import { uiModules } from 'ui/modules';
import getInitialState from './initial_state';
import middleware from './middleware';
import getRootReducer from './reducers';
import { historyProvider } from '../lib/history_provider';

const app = uiModules.get('apps/canvas');

app.service('$store', (kbnVersion, basePath) => {
  const initialState = getInitialState();
  initialState.app = { kbnVersion, basePath }; // Set the defaults from Kibana plugin

  const rootReducer = getRootReducer(initialState);
  const store = createStore(rootReducer, initialState, middleware);

  // replace history, to ensure back always works correctly
  const { persistent } = store.getState();
  const history = historyProvider(window);
  history.replace(persistent);

  // debugging
  window.store = store;

  return store;
});
