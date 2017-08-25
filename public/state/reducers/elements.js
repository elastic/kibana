import { handleActions } from 'redux-actions';
import { get, findIndex } from 'lodash';
import { assign, push, del } from 'object-path-immutable';
import * as actions from '../actions/elements';


function assignElementProperties(workpadState, pageId, elementId, props) {
  const pageIndex = findIndex(get(workpadState, 'pages'), { id: pageId });
  const elementsPath = ['pages', pageIndex, 'elements'];
  const elementIndex = findIndex(get(workpadState, elementsPath), { id: elementId });

  if (pageIndex === -1 || elementIndex === -1) return workpadState;
  return assign(workpadState, elementsPath.concat(elementIndex), props);
}

export default handleActions({
  // TODO: This takes the entire element, which is not neccesary, it could just take the id.
  [actions.setExpression]: (workpadState, { payload }) => {
    const { expression, pageId, elementId } = payload;
    return assignElementProperties(workpadState, pageId, elementId, { expression });
  },
  [actions.setFilter]: (workpadState, { payload }) => {
    const { filter, pageId, elementId } = payload;
    return assignElementProperties(workpadState, pageId, elementId, { filter });
  },
  // This take elementId, not the full element, otherwise it is 80% the same as the above reducer
  [actions.setPosition]: (workpadState, { payload }) => {
    const { position, pageId, elementId } = payload;
    return assignElementProperties(workpadState, pageId, elementId, { position });
  },
  [actions.addElement]: (workpadState, { payload: { pageId, element } }) => {
    // find the index of the given pageId
    const pageIndex = workpadState.pages.findIndex(page => page.id === pageId);

    // TODO: handle invalid page id
    if (pageIndex < 0) return workpadState;

    return push(workpadState, ['pages', pageIndex, 'elements'], element);
  },
  [actions.removeElement]: (workpadState, { payload: { pageId, elementId } }) => {
    const pageIndex = workpadState.pages.findIndex(page => page.id === pageId);

    // TODO: handle invalid page id
    if (pageIndex < 0) return workpadState;

    const { elements } = workpadState.pages[pageIndex];
    const elementIndex = elements.findIndex(element => element.id === elementId);

    // TODO: handle invalid element id
    if (elementIndex < 0) return workpadState;

    return del(workpadState, ['pages', pageIndex, 'elements', elementIndex]);
  },
}, {});
