import { handleActions } from 'redux-actions';
import { get, findIndex } from 'lodash';
import { assign } from 'object-path-immutable';
import * as actions from '../actions/elements';

export default handleActions({
  [actions.setAstAndExpression]: (workpadState, { payload }) => {
    const { expression, ast, pageId, element } = payload;
    const elementsPath = ['pages', pageId, 'elements'];
    const elementIndex = findIndex(get(workpadState, elementsPath), { id: element.id });
    return assign(workpadState, elementsPath.concat(elementIndex), { ast, expression });
  },
}, {});
