import { createStore } from 'redux';
import { uiModules } from 'ui/modules';
import getInitialState from './initial_state';
import middleware from './middleware';
import getRootReducer from './reducers';
import { historyProvider } from '../lib/history_provider';
import { onStart } from './on_start';
import { uniqBy } from 'lodash';
import { functions as clientFunctionsRegistry } from '../lib/functions';

const app = uiModules.get('apps/canvas');

app.service('$store', (kbnVersion, basePath, serverFunctions) => {
  const clientFunctionsPOJO = JSON.parse(JSON.stringify(clientFunctionsRegistry.toArray())); // this is effectively what happens to serverFunctions
  const functionDefinitions = uniqBy(serverFunctions.concat(clientFunctionsPOJO), 'name');

  const initialState = getInitialState();

  // Set the defaults from Kibana plugin
  initialState.app = {
    kbnVersion,
    functionDefinitions,
    basePath,
    ready: false,
  };

  const rootReducer = getRootReducer(initialState);
  const store = createStore(rootReducer, initialState, middleware);

  // replace history, to ensure back always works correctly
  const { persistent } = store.getState();
  const history = historyProvider(window);
  history.replace(persistent);

  // debugging
  window.store = store;
  onStart(store);

  return store;
});
