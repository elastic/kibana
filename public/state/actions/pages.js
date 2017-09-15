import { createAction } from 'redux-actions';

export const addPage = createAction('addPage');
export const loadPage = createAction('loadPage');
export const movePage = createAction('movePage', (id, position) => ({ id, position }));
export const removePage = createAction('removePage');
export const nextPage = createAction('nextPage');
export const previousPage = createAction('previousPage');

export const stylePage = createAction('stylePage', (pageId, style) => ({ pageId, style }));
