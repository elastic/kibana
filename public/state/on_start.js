import chrome from 'ui/chrome';
import { loadServerFunctions } from './actions/app';
import { initializeWorkpad } from './actions/workpad';

export const onStart = (store) => {
  store.dispatch(initializeWorkpad());
  store.dispatch(loadServerFunctions(chrome.getBasePath()));
};
