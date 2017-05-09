import { handleActions } from 'redux-actions';
import { get, findIndex } from 'lodash';
import { assign } from 'object-path-immutable';
import * as actions from '../actions/elements';

export default handleActions({
  [actions.setAstAndExpression]: (workpadState, { payload }) => {
    const { expression, ast, pageId, element } = payload;
    const pageIndex = findIndex(get(workpadState, 'pages'), { id: pageId });
    const elementsPath = ['pages', pageIndex, 'elements'];
    const elementIndex = findIndex(get(workpadState, elementsPath), { id: element.id });

    if (pageIndex === -1 || elementIndex === -1) return workpadState;
    return assign(workpadState, elementsPath.concat(elementIndex), { ast, expression });
  },
}, {});
