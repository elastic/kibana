import { initializeWorkpad } from './actions/workpad';

export const onStart = (store) => {
  store.dispatch(initializeWorkpad());
};
