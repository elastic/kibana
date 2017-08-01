import { createAction } from 'redux-actions';
import { get, omit } from 'lodash';
import { set, del } from 'object-path-immutable';
import { createThunk } from 'redux-thunks';
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

export const fetchContext = createThunk('fetchContext', ({ dispatch, getState }, { index }) => {
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
});

export const fetchRenderable = createThunk('fetchRenderable', ({ dispatch, getState }, elementId, pageId) => {
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
});

export const fetchAllRenderables = createThunk('fetchAllRenderables', ({ dispatch, getState }) => {
  const pages = getPages(getState());
  pages.forEach(page => {
    page.elements.forEach(element => {
      dispatch(fetchRenderable(element.id, page.id));
    });
  });
});

export const setExpression = createThunk('setExpression', ({ dispatch }, payload) => {
  const _setExpression = createAction('setExpression');
  dispatch(_setExpression(payload));
  dispatch(fetchRenderable(payload.element.id, payload.pageId));
});

export const setAst = createThunk('setAst', ({ dispatch }, payload) => {
  dispatch(setExpression(astToExpression(payload)));
});

// index here is the top-level argument in the expression. for example in the expression
// demodata().pointseries().plot(), demodata is 0, pointseries is 1, and plot is 2
export const setAstAtIndex = createThunk('setAstAtIndex', ({ dispatch }, { index, ast, element, pageId }) => {
  const newElement = set(element, ['ast', 'chain', index], ast);
  dispatch(setExpression(astToExpression({ ast: get(newElement, 'ast'), element, pageId })));
});

// index here is the top-level argument in the expression. for example in the expression
// demodata().pointseries().plot(), demodata is 0, pointseries is 1, and plot is 2
// argIndex is the index in multi-value arguments, and is optional. excluding it will cause
// the entire argument from be set to the passed value
export const setArgumentAtIndex = createThunk('setArgumentAtIndex', ({ dispatch }, args) => {
  const { index, element, pageId, argName, value, valueIndex } = args;
  const selector = ['ast', 'chain', index, 'arguments', argName];
  if (valueIndex != null) selector.push(valueIndex);

  const newElement = set(element, selector, value);
  dispatch(setExpression(astToExpression({ ast: get(newElement, 'ast'), element, pageId })));
});

// index here is the top-level argument in the expression. for example in the expression
// demodata().pointseries().plot(), demodata is 0, pointseries is 1, and plot is 2
export const addArgumentValueAtIndex = createThunk('addArgumentValueAtIndex', ({ dispatch }, args) => {
  const { index, argName, value, element } = args;

  const values = get(element, ['ast', 'chain', index, 'arguments', argName], []);
  const newValue = values.concat(value);

  dispatch(setArgumentAtIndex({
    ...args,
    value: newValue,
  }));
});

// index here is the top-level argument in the expression. for example in the expression
// demodata().pointseries().plot(), demodata is 0, pointseries is 1, and plot is 2
// argIndex is the index in multi-value arguments, and is optional. excluding it will remove
// the entire argument from the expresion
export const deleteArgumentAtIndex = createThunk('deleteArgumentAtIndex', ({ dispatch }, args) => {
  const { index, element, pageId, argName, argIndex } = args;
  const curVal = get(element, ['ast', 'chain', index, 'arguments', argName]);

  const newElement = (argIndex != null && curVal.length > 1)
    // if more than one val, remove the specified val
    ? del(element, ['ast', 'chain', index, 'arguments', argName, argIndex])
    // otherwise, remove the entire key
    : del(element, ['ast', 'chain', index, 'arguments', argName]);

  dispatch(setExpression(astToExpression({ ast: get(newElement, 'ast'), element, pageId })));
});

/*
  payload: element defaults. Eg {expression: 'foo()'}
*/
export const addElement = createThunk('addElement', ({ dispatch }, element, pageId) => {
  const newElement = Object.assign({}, getDefaultElement(), omit(element, 'id'));
  const _addElement = createAction('addElement', () => ({ pageId, element: newElement }));
  dispatch(_addElement());
  dispatch(fetchRenderable(newElement.id, pageId));
});
