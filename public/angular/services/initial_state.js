import uniqBy from 'lodash.uniqby';
import { uiModules } from 'ui/modules';
import { getInitialState } from '../../state/initial_state';
import { functionsRegistry } from '../../../common/lib/functions_registry';

const app = uiModules.get('apps/canvas');
app.service('canvasInitialState', (kbnVersion, basePath, serverFunctions) => {
  // this is effectively what happens to serverFunctions
  const clientFunctionsPOJO = JSON.parse(JSON.stringify(functionsRegistry.toArray()));
  const functionDefinitions = uniqBy(serverFunctions.concat(clientFunctionsPOJO), 'name');

  const initialState = getInitialState();

  // Set the defaults from Kibana plugin
  initialState.app = {
    kbnVersion,
    functionDefinitions,
    basePath,
    ready: false,
  };

  return initialState;
});
