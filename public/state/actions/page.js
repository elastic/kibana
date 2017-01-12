import { createAction } from 'redux-actions';

export const pageSet = createAction('PAGE_SET');

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
