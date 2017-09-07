import { createAction } from 'redux-actions';

export const change = createAction('CHANGE', (id, data) => ({ id, data }));
export const createItem = createAction('CREATE_ITEM', (id, defaultData) => ({ id, defaultData }));
