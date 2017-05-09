import { createAction } from 'redux-actions';
import { isEqual } from 'lodash';
import { set } from 'object-path-immutable';
import { fetch } from '../../../common/lib/fetch';
import { interpretAst } from '../../lib/interpreter';
import * as args from './resolved_args';

// exported actions, used by reducers
export const setAstAndExpression = createAction('setElementAstAndExpression');

export const setAst = createAction('setAst', ({ ast }) => {
  return fetch.post('/api/expression', JSON.stringify(ast)).then(res => res.data);
}, ({ ast, element, pageId }) => ({
  onComplete: (dispatch, getState, expression) => {
    if (element.expression === expression && isEqual(element.ast, ast)) return;
    dispatch(setAstAndExpression({ expression, ast, element, pageId }));
  },
}));

export const setExpressionAst = ({ ast, element, pageId, index }) => {
  const { ast: elementAst } = element;
  const newAst = set(elementAst, ['chain', index], ast);

  return setAst({ ast: newAst, element, pageId });
};

export const setExpression = createAction('setExpression', ({ expression }) => {
  return fetch.get(`/api/ast/?expression=${expression}`).then(res => res.data);
}, ({ expression, element, pageId }) => ({
  onComplete: (dispatch, getState, ast) => {
    if (element.expression === expression && isEqual(element.ast, ast)) return;
    dispatch(args.clear({ path: element.id }));
    dispatch(setAstAndExpression({ expression, ast, element, pageId }));
  },
}));

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
  const argumentPath = [element.id, contextIndex];

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
