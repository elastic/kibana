import { createAction } from 'redux-actions';

export const addPage = createAction('addPage');
export const duplicatePage = createAction('duplicatePage');
export const gotoPage = createAction('gotoPage');
export const movePage = createAction('movePage', (id, position) => ({ id, position }));
export const removePage = createAction('removePage');
export const stylePage = createAction('stylePage', (pageId, style) => ({ pageId, style }));
export const setPage = createAction('setPage');
export const setPageTransition = createAction('setPageTransition', (pageId, transition) => ({
  pageId,
  transition,
}));
