import { createAction } from 'redux-actions';
import { get, isEqual } from 'lodash';
import { set } from 'object-path-immutable';
import { getSelectedElement } from '../selectors/workpad';
import { interpretAst } from '../../lib/interpreter';
import { getType } from '../../../common/types/get_type';
import { fromExpression, toExpression } from '../../../common/lib/ast';
import * as args from './resolved_args';

// exported actions, used by reducers
export const setElementExpression = createAction('setElementExpression');

export const fetchContext = ({ index }) => (dispatch, getState) => {
  const element = getSelectedElement(getState());
  const chain = get(element, ['ast', 'chain']);
  const invalidIndex = (chain) ? index >= chain.length : true;

  if (!element || !chain || invalidIndex) {
    return Promise.reject(`Invalid argument index: ${index}`);
  }

  const contextIndex = index - 1;
  const argumentPath = [element.id, 'expressionContext', contextIndex];

  dispatch(args.setLoading({
    path: argumentPath,
  }));

  // get context data from a partial AST
  return interpretAst({
    ...element.ast,
    chain: element.ast.chain.filter((exp, i) => i < index),
  })
  .then((value) => {
    dispatch(args.setValue({
      path: argumentPath,
      value,
    }));
  });
};

export const fetchRenderable = () => (dispatch, getState) => {
  const element = getSelectedElement(getState());
  const argumentPath = [element.id, 'expressionRenderable'];
  const { ast } = element;

  dispatch(args.setLoading({
    path: argumentPath,
  }));

  function run(ast, context) {
    return interpretAst(ast, context)
    .then((renderable) => {
      if (getType(renderable) === 'render') {
        return renderable;
      } else if (!context) {
        return run(fromExpression('render()'), renderable);
      }

      return new Error(`Ack! I don't know how to render a '${getType(renderable)}'`);
    });
  }

  return run(ast)
  .then((renderable) => {
    dispatch(args.setValue({
      path: argumentPath,
      value: renderable,
    }));
  });
};

// actions without a reducer, typically used to dispatch other actions
export const setAst = ({ ast, element, pageId }) => (dispatch) => {
  const expression = toExpression(ast);
  dispatch(setElementExpression({ expression, element, pageId }));
  dispatch(fetchRenderable());
};

export const setAstAtIndex = ({ ast, element, pageId, index }) => {
  const newAst = set(element, ['ast', 'chain', index], ast);
  return setAst({ ast: newAst, element, pageId });
};

export const setExpression = ({ expression, element, pageId }) => (dispatch) => {
  const ast = fromExpression(expression);

  // if ast is unchanged, short circuit state update
  if (isEqual(element.ast, ast)) return;

  dispatch(args.clear({ path: [ element.id, 'expressionContext' ] }));
  dispatch(setElementExpression({ expression, element, pageId }));
  dispatch(fetchRenderable());
};
