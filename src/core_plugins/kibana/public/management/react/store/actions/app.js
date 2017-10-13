import { createAction } from 'redux-actions';

export const initData = createAction('INIT_DATA', (version, config) => {
  return {
    version,
    config,
  };
});
