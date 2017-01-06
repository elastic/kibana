import { createAction } from 'redux-actions';

export const oneUp = createAction('ONE_ADD');

export function twoUp(payload) {
  return (dispatch, getState) => {
    dispatch(oneUp());
    dispatch(oneUp());
  };
};
