import { createAction } from 'redux-actions';
import { get } from 'lodash';
import { assign } from 'object-path-immutable';
import { notify } from '../../lib/notify';
import { getSelectedElement, getElementById } from '../selectors/workpad';
import { interpretAst } from '../../lib/interpreter';
import { getType } from '../../../common/types/get_type';
import { fromExpression, toExpression } from '../../../common/lib/ast';
import * as args from './resolved_args';


function astToExpression({ ast, element, pageId }) {
  try {
    return { expression: toExpression(ast), pageId, element };
  } catch (e) {
    notify.error(e);
    return { expression: element.expression, pageId, element };
  }
}

export const addElement = createAction('addElement', (expression, pageId) => ({ pageId, expression }));

export const removeElement = createAction('removeElement', (elementId, pageId) => ({ pageId, elementId }));

export const setExpression = createAction('setExpression');

export const setAst = createAction('setAst', astToExpression);

export const setArgumentAtIndex = createAction('setArgumentAtIndex', ({ index, arg, element, pageId }) => {
  const newElement = assign(element, ['ast', 'chain', index, 'arguments'], arg);
  return astToExpression({ ast: get(newElement, 'ast'), element, pageId });
});

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
fetchContext.toString = () => 'fetchContext'; // createAction name proxy

export const fetchRenderable = (elementId, pageId) => (dispatch, getState) => {
  const element = getElementById(getState(), elementId, pageId);
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
fetchRenderable.toString = () => 'fetchRenderable'; // createAction name proxy
