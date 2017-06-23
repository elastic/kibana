import { createAction } from 'redux-actions';

export const addPage = createAction('addPage');
export const nextPage = createAction('nextPage');
export const previousPage = createAction('previousPage');

export const stylePage = createAction('stylePage', (pageId, style) => ({ pageId, style }));
