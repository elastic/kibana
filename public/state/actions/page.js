import { createAction } from 'redux-actions';
import { getPageTemplate } from '../templates';
import { elementRemove } from './element';
import _ from 'lodash';


export const pageSet = createAction('PAGE_SET');
export const pageReplace = createAction('PAGE_REPLACE');

export function pageAdd() {
  return (dispatch, getState) => {
    const action = createAction('PAGE_ADD');
    dispatch(action(getPageTemplate()));
    dispatch(pageSet(getState().persistent.workpad.pages.length - 1));
  };
}

export function pageRemove(id) {
  return (dispatch, getState) => {
    const {workpad, pages} = getState().persistent;
    if (workpad.pages.length === 1) return;

    const page = pages[id];
    _.each(page.elements, elementId => dispatch(elementRemove(elementId)));

    const action = createAction('PAGE_REMOVE');
    const pageIndex = workpad.pages.indexOf(id);
    const pageCount = workpad.pages.length;
    // if pageIndex == 0, do nothing
    // if pageIndex == workpad.pages.length - 1, set to that again
    if (pageIndex === pageCount - 1) dispatch(pageSet(pageCount - 2));
    dispatch(action(id));
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
