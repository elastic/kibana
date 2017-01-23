import { createAction } from 'redux-actions';
import { getPageTemplate } from '../templates';

export const pageSet = createAction('PAGE_SET');

export function pageAdd() {
  return (dispatch, getState) => {
    const action = createAction('PAGE_ADD');
    dispatch(action(getPageTemplate()));
    dispatch(pageSet(getState().persistent.workpad.pages.length - 1));
  };
}

export function pageNext() {
  return (dispatch, getState) => {
    const {page, pages} = getState().persistent.workpad;
    const newPage = page + 1;
    if (newPage < pages.length) dispatch(pageSet(newPage));
  };
}

export function pagePrevious() {
  return (dispatch, getState) => {
    const {page, pages} = getState().persistent.workpad;
    const newPage = page - 1;
    if (newPage >= 0) dispatch(pageSet(newPage));
  };
}
