import { uniqBy } from 'lodash';
import { uiModules } from 'ui/modules';
import { onStart } from '../../state/on_start';
import { getInitialState } from '../../state/initial_state';
import { setStore } from '../../state/store';
import { historyProvider } from '../../lib/history_provider';
import { functionsRegistry } from '../../../common/lib/functions_registry';

const app = uiModules.get('apps/canvas');
app.service('canvasStore', (kbnVersion, basePath, serverFunctions, $window) => {
  // this is effectively what happens to serverFunctions
  const clientFunctionsPOJO = JSON.parse(JSON.stringify(functionsRegistry.toArray()));
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
  const history = historyProvider($window);
  history.replace(persistent);

  // debugging
  window.canvasStore = store;
  onStart(store);

  return store;
});
