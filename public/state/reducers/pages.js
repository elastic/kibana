import { push, set } from 'object-path-immutable';
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

  return workpadState;
}
