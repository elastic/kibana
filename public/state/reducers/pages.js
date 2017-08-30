import { push, set } from 'object-path-immutable';
import { findIndex } from 'lodash';
import { getDefaultPage } from '../defaults';

function setPageIndex(workpadState, index) {
  if (index < 0 || !workpadState.pages[index]) return workpadState;
  return set(workpadState, 'page', index);
}
export default function pagesReducer(workpadState = {}, { type, payload }) {

  if (type === 'addPage') {
    const withNewPage = push(workpadState, 'pages', payload || getDefaultPage());
    return setPageIndex(withNewPage, withNewPage.pages.length - 1);
  }

  if (type === 'nextPage') {
    return setPageIndex(workpadState, workpadState.page + 1);
  }

  if (type === 'previousPage') {
    return setPageIndex(workpadState, workpadState.page - 1);
  }

  if (type === 'stylePage') {
    const pageIndex = findIndex(workpadState.pages, { id: payload.pageId });
    return set(workpadState, ['pages', pageIndex, 'style'], payload.style);
  }

  return workpadState;
}
