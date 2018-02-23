import { uiModules } from 'ui/modules';
import { createStore } from '../../state/store';

const app = uiModules.get('apps/canvas');
app.service('canvasStore', canvasInitialState => {
  const store = createStore(canvasInitialState);

  // TODO: debugging, remove this
  window.canvasStore = store;

  return store;
});
