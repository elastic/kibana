import { handleActions, combineActions } from 'redux-actions';
import { get, findIndex } from 'lodash';
import uuid from 'uuid/v4';
import { assign, push, del } from 'object-path-immutable';
import * as actions from '../actions/elements';

const expressionActions = combineActions(
  actions.setAst,
  actions.setExpression,
  actions.setArgumentAtIndex
);

export default handleActions({
  [expressionActions]: (workpadState, { payload }) => {
    const { expression, pageId, element } = payload;
    const pageIndex = findIndex(get(workpadState, 'pages'), { id: pageId });
    const elementsPath = ['pages', pageIndex, 'elements'];
    const elementIndex = findIndex(get(workpadState, elementsPath), { id: element.id });

    if (pageIndex === -1 || elementIndex === -1) return workpadState;
    return assign(workpadState, elementsPath.concat(elementIndex), { expression });
  },
  [actions.addElement]: (workpadState, { payload: { pageId, expression } }) => {
    const elementId = `element-${uuid()}`;
    const element = Object.assign({
      id: elementId,
      position: {
        top: 20,
        left: 20,
        height: 500,
        width: 700,
        rotation: 0,
      },
      expression: `
        demodata()
        .pointseries(y="median(cost)", x=time, color="project")
        .plot(defaultStyle=seriesStyle(lines=1))
      `,
    }, { expression: expression });

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
