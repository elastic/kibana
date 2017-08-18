/* eslint-disable */
export const INIT_DATA = 'INIT_DATA';
export const initData = (version, config) => {
  return {
    type: INIT_DATA,
    version,
    config,
  };
};
