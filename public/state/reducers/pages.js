import { handleActions } from 'redux-actions';
import { push, set, del, insert } from 'object-path-immutable';
import { findIndex } from 'lodash';
import { getDefaultPage } from '../defaults';
import * as actions from '../actions/pages';

function setPageIndex(workpadState, index) {
  if (index < 0 || !workpadState.pages[index]) return workpadState;
  return set(workpadState, 'page', index);
}

function getIndexById(workpadState, id) {
  return workpadState.pages.findIndex(page => page.id === id);
}

function addPage(workpadState, payload) {
  return push(workpadState, 'pages', payload || getDefaultPage());
}

export default handleActions({
  [actions.addPage]: (workpadState, { payload }) => {
    const withNewPage = addPage(workpadState, payload);
    return setPageIndex(withNewPage, withNewPage.pages.length - 1);
  },

  [actions.nextPage]: (workpadState) => {
    return setPageIndex(workpadState, workpadState.page + 1);
  },

  [actions.previousPage]: (workpadState) => {
    return setPageIndex(workpadState, workpadState.page - 1);
  },

  [actions.loadPage]: (workpadState, { payload }) => {
    const pageIndex = getIndexById(workpadState, payload);
    if (pageIndex >= 0) return set(workpadState, 'page', pageIndex);
  },

  [actions.movePage]: (workpadState, { payload }) => {
    const { id, position } = payload;
    const pageIndex = getIndexById(workpadState, id);
    const newIndex = pageIndex + position;

    // don't move pages past the first or last position
    if (newIndex < 0 || newIndex >= workpadState.pages.length) return workpadState;

    // remove and re-insert the page
    const page = { ...workpadState.pages[pageIndex] };
    const newState = insert(del(workpadState, `pages.${pageIndex}`), 'pages', page, newIndex);

    // adjust the selected page index and return the new state
    const selectedId = workpadState.pages[workpadState.page].id;
    const newSelectedIndex = newState.pages.findIndex(page => page.id === selectedId);
    return set(newState, 'page', newSelectedIndex);
  },

  [actions.removePage]: (workpadState, { payload }) => {
    const curIndex = workpadState.page;
    const delIndex = getIndexById(workpadState, payload);
    if (delIndex >= 0) {
      let newState = del(workpadState, `pages.${delIndex}`);
      const wasSelected = curIndex === delIndex;
      const wasOnlyPage = newState.pages.length === 0;
      const newSelectedPage = curIndex >= delIndex ? curIndex - 1 : curIndex;

      // if we removed the only page, create a new empty one
      if (wasOnlyPage) newState = addPage(newState);

      // if we removed the only page or the selected one, select the first one
      if (wasOnlyPage || wasSelected) return set(newState, 'page', 0);

      // set the adjusted selected page on new state
      return set(newState, 'page', newSelectedPage);
    }
  },

  [actions.stylePage]: (workpadState, { payload }) => {
    const pageIndex = findIndex(workpadState.pages, { id: payload.pageId });
    return set(workpadState, ['pages', pageIndex, 'style'], payload.style);
  },
}, {});
