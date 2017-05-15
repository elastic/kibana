import { createAction } from 'redux-actions';
import { isEqual } from 'lodash';
import { set } from 'object-path-immutable';
import { interpretAst } from '../../lib/interpreter';
import { fromExpression, toExpression } from '../../../common/lib/ast';
import * as args from './resolved_args';

// exported actions, used by reducers
export const setAstAndExpression = createAction('setElementAstAndExpression');

export const setAst = ({ ast, element, pageId }) => (dispatch) => {
  const expression = toExpression(ast);
  if (element.expression === expression && isEqual(element.ast, ast)) return;
  dispatch(setAstAndExpression({ expression, ast, element, pageId }));
};

export const setExpressionAst = ({ ast, element, pageId, index }) => {
  const newAst = set(element, ['ast', 'chain', index], ast);
  return setAst({ ast: newAst, element, pageId });
};

export const setExpression = ({ expression, element, pageId }) => (dispatch) => {
  const ast = fromExpression(expression);
  if (element.expression === expression && isEqual(element.ast, ast)) return;
  dispatch(args.clear({ path: element.id }));
  dispatch(setAstAndExpression({ expression, ast, element, pageId }));
};

export const fetchContext = createAction('fetchContext', ({ element, index }) => {
  const invalidAst = !Array.isArray(element.ast.chain);
  const invalidIndex = index >= element.ast.chain.length;

  if (!element || invalidAst || invalidIndex) {
    return Promise.reject(`Invalid argument index: ${index}`);
  }

  // get context data from a partial AST
  return interpretAst({
    ...element.ast,
    chain: element.ast.chain.filter((exp, i) => i < index),
  });
}, ({ element, index }) => {
  const contextIndex = index - 1;
  const argumentPath = [element.id, 'expressionContext', contextIndex];

  return {
    onStart: (dispatch) => dispatch(args.setLoading({
      path: argumentPath,
    })),
    onComplete: (dispatch, getState, value) => dispatch(args.setValue({
      path: argumentPath,
      value,
    })),
  };
});
