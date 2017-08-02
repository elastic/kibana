import { createAction } from 'redux-actions';
import { get, omit } from 'lodash';
import { set, del } from 'object-path-immutable';
import { createThunk } from 'redux-thunks';
import * as args from './resolved_args';
import { getPages } from '../selectors/workpad';
import { getValue } from '../selectors/resolved_args';
import { getDefaultElement } from '../defaults';
import { getType } from '../../../common/types/get_type';
import { fromExpression, toExpression } from '../../../common/lib/ast';
import { interpretAst } from '../../lib/interpreter';
import { notify } from '../../lib/notify';

function astToExpression(ast, element) {
  try {
    return toExpression(ast);
  } catch (e) {
    notify.error(e);
    return element.expression;
  }
}

function runInterpreter(ast, context, retry = false) {
  return interpretAst(ast, context)
  .then((renderable) => {
    if (getType(renderable) === 'render') {
      return renderable;
    } else if (!context && !retry) {
      return runInterpreter(fromExpression('render()'), renderable || context, true);
    }

    return new Error(`Ack! I don't know how to render a '${getType(renderable)}'`);
  });
}

export const removeElement = createAction('removeElement', (elementId, pageId) => ({ pageId, elementId }));
export const setPosition = createAction('setPosition', (elementId, pageId, position) => ({ pageId, elementId, position }));

export const fetchContext = createThunk('fetchContext', ({ dispatch }, { index, element }) => {
  const chain = get(element, ['ast', 'chain']);
  const invalidIndex = (chain) ? index >= chain.length : true;

  if (!element || !chain || invalidIndex) {
    throw new Error(`Invalid argument index: ${index}`);
  }

  // cache context as the previous index
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

export const fetchRenderable = createThunk('fetchRenderable', ({ dispatch, getState }, element) => {
  const argumentPath = [element.id, 'expressionRenderable'];
  const ast = element.ast || fromExpression(element.expression);

  dispatch(args.setLoading({
    path: argumentPath,
  }));

  return runInterpreter(ast)
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

export const fetchRenderableWithContext = createThunk('fetchRenderableWithContext', ({ dispatch }, element, ast, context) => {
  const argumentPath = [element.id, 'expressionRenderable'];

  dispatch(args.setLoading({
    path: argumentPath,
  }));

  return runInterpreter(ast, context)
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
      dispatch(fetchRenderable(element));
    });
  });
});

export const setExpression = createThunk('setExpression', ({ dispatch }, expression, element, pageId, skipRender = false) => {
  const _setExpression = createAction('setExpression');
  dispatch(_setExpression({ expression, element, pageId }));
  if (skipRender !== true) dispatch(fetchRenderable(element));
});

export const setAst = createThunk('setAst', ({ dispatch }, ast, element, pageId, skipRender = false) => {
  const expression = astToExpression(ast, element);
  dispatch(setExpression(expression, element, pageId, skipRender));
});

// index here is the top-level argument in the expression. for example in the expression
// demodata().pointseries().plot(), demodata is 0, pointseries is 1, and plot is 2
export const setAstAtIndex = createThunk('setAstAtIndex', ({ dispatch, getState }, { index, ast, element, pageId }) => {
  const newElement = set(element, ['ast', 'chain', index], ast);
  const newAst = get(newElement, 'ast');

  // fetch renderable using existing context, if available (value is null if not cached)
  const contextPath = [element.id, 'expressionContext', index - 1];
  const contextValue = getValue(getState(), contextPath);

  // if we have a cached context, update the expression, but use cache when updating the renderable
  if (contextValue) {
    // set the expression, but skip the fetchRenderable step
    dispatch(setAst(newAst, element, pageId, true));

    // use context when updating the expression, it will be passed to the intepreter
    const partialAst = {
      ...newAst,
      chain: newAst.chain.filter((exp, i) => i >= index),
    };
    return dispatch(fetchRenderableWithContext(newElement, partialAst, contextValue));
  }

  // if no cached context, update the ast like normal
  dispatch(setAst(newAst, element, pageId));
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
  const newAst = get(newElement, ['ast', 'chain', index]);
  dispatch(setAstAtIndex({ ast: newAst, index, element, pageId }));
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

  dispatch(setAst(get(newElement, 'ast'), element, pageId));
});

/*
  payload: element defaults. Eg {expression: 'foo()'}
*/
export const addElement = createThunk('addElement', ({ dispatch }, pageId, element) => {
  const newElement = Object.assign({}, getDefaultElement(), omit(element, 'id'));
  const _addElement = createAction('addElement');
  dispatch(_addElement({ pageId, element: newElement }));
  dispatch(fetchRenderable(newElement));
});
