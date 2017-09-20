import { createAction } from 'redux-actions';

export const changeSort = createAction('CHANGE_SORT', (sortBy, sortAsc) => ({ sortBy, sortAsc }));
export const changeFilter = createAction('CHANGE_FILTER', filterBy => ({ filterBy }));
export const changePaginate = createAction('CHANGE_PAGINATE', (page, perPage) => ({ page, perPage }));
