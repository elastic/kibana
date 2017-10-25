import { uiModules } from 'ui/modules';
import { historyProvider } from '../lib/history_provider';
import { onStart } from './on_start';
import { uniqBy } from 'lodash';
import { functionsRegistry } from '../../common/lib/functions';
import { getInitialState } from './initial_state';
import { setStore } from './store';

const app = uiModules.get('apps/canvas');

app.service('$store', (kbnVersion, basePath, serverFunctions) => {
  const clientFunctionsPOJO = JSON.parse(JSON.stringify(functionsRegistry.toArray())); // this is effectively what happens to serverFunctions
  const functionDefinitions = uniqBy(serverFunctions.concat(clientFunctionsPOJO), 'name');

  const initialState = getInitialState();

  // Set the defaults from Kibana plugin
  initialState.app = {
    kbnVersion,
    functionDefinitions,
    basePath,
    ready: true,
  };

  const store = setStore(initialState);

  // replace history, to ensure back always works correctly
  const { persistent } = store.getState();
  const history = historyProvider(window);
  history.replace(persistent);

  // debugging
  window.canvasStore = store;
  onStart(store);

  return store;
});
