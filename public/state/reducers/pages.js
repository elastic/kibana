import { push, set } from 'object-path-immutable';
import { findIndex } from 'lodash';
import { getDefaultPage } from '../defaults';


export default function pagesReducer(workpadState = {}, { type, payload }) {
  function setPageIndex(index) {
    if (index < 0 || !workpadState.pages[index]) return workpadState;
    return set(workpadState, 'page', index);
  }

  if (type === 'addPage') {
    return push(workpadState, 'pages', payload || getDefaultPage());
  }

  if (type === 'nextPage') {
    return setPageIndex(workpadState.page + 1);
  }

  if (type === 'previousPage') {
    return setPageIndex(workpadState.page - 1);
  }

  if (type === 'stylePage') {
    const pageIndex = findIndex(workpadState.pages, { id: payload.pageId });
    return set(workpadState, ['pages', pageIndex, 'style'], payload.style);
  }

  return workpadState;
}
