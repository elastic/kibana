import { createAction } from 'redux-actions';
import { get, omit } from 'lodash';
import { assign, set } from 'object-path-immutable';
import { notify } from '../../lib/notify';
import { getSelectedElement, getElementById, getPages } from '../selectors/workpad';
import { getDefaultElement } from '../defaults';
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

export const removeElement = createAction('removeElement', (elementId, pageId) => ({ pageId, elementId }));
export const setPosition = createAction('setPosition', (elementId, pageId, position) => ({ pageId, elementId, position }));

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

  function run(ast, context, retry = false) {
    return interpretAst(ast, context)
    .then((renderable) => {
      if (getType(renderable) === 'render') {
        return renderable;
      } else if (!context && !retry) {
        return run(fromExpression('render()'), renderable, true);
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
  })
  .catch((err) => {
    notify.error(err);
    dispatch(args.setValue({
      path: argumentPath,
      value: err,
    }));
  });
};

export const fetchAllRenderables = () => (dispatch, getState) => {
  const pages = getPages(getState());
  pages.forEach(page => {
    page.elements.forEach(element => {
      dispatch(fetchRenderable(element.id, page.id));
    });
  });
};

export const setExpression = payload => (dispatch) => {
  const _setExpression = createAction('setExpression');
  dispatch(_setExpression(payload));
  dispatch(fetchRenderable(payload.element.id, payload.pageId));
};
setExpression.toString = () => 'setExpression';

export const setAst = payload => (dispatch) => {
  dispatch(setExpression(astToExpression(payload)));
};

// index here is the top-level argument in the expression. for example in the expression
// demodata().pointseries().plot(), demodata is 0, pointseries is 1, and plot is 2
export const setAstAtIndex = ({ index, ast, element, pageId }) => (dispatch) => {
  const newElement = set(element, ['ast', 'chain', index], ast);
  dispatch(setExpression(astToExpression({ ast: get(newElement, 'ast'), element, pageId })));
};

// index here is the top-level argument in the expression. for example in the expression
// demodata().pointseries().plot(), demodata is 0, pointseries is 1, and plot is 2
export const setArgumentAtIndex = ({ index, arg, element, pageId }) => (dispatch) => {
  const newElement = assign(element, ['ast', 'chain', index, 'arguments'], arg);
  dispatch(setExpression(astToExpression({ ast: get(newElement, 'ast'), element, pageId })));
};

/*
  payload: element defaults. Eg {expression: 'foo()'}
*/
export const addElement = (element, pageId) => (dispatch) => {
  const newElement = Object.assign({}, getDefaultElement(), omit(element, 'id'));
  const _addElement = createAction('addElement', () => ({ pageId, element: newElement }));
  dispatch(_addElement());
  dispatch(fetchRenderable(newElement.id, pageId));
};
addElement.toString = () => 'addElement';
