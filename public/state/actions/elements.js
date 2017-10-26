import { createAction } from 'redux-actions';
import { get, omit } from 'lodash';
import { set, del } from 'object-path-immutable';
import { createThunk } from 'redux-thunks';
import * as args from './resolved_args';
import { getPages, getElementById } from '../selectors/workpad';
import { getValue } from '../selectors/resolved_args';
import { getDefaultElement } from '../defaults';
import { getType } from '../../../common/lib/get_type';
import { fromExpression, toExpression, safeElementFromExpression } from '../../../common/lib/ast';
import { interpretAst } from '../../lib/interpreter';
import { notify } from '../../lib/notify';

function runInterpreter(ast, context = null, retry = false) {
  return interpretAst(ast, context)
  .then((renderable) => {
    if (getType(renderable) === 'render') {
      return renderable;
    }

    if (!retry) {
      return runInterpreter(fromExpression('render'), renderable || context, true);
    }

    return new Error(`Ack! I don't know how to render a '${getType(renderable)}'`);
  })
  .catch((err) => {
    notify.error(err);
    throw err;
  });
}

function getSiblingContext(state, elementId, checkIndex) {
  const prevContextPath = [elementId, 'expressionContext', checkIndex];
  const prevContextValue = getValue(state, prevContextPath);

  // if a value is found, return it, along with the index it was found at
  if (prevContextValue != null) {
    return {
      index: checkIndex,
      context: prevContextValue,
    };
  }

  // check previous index while we're still above 0
  const prevContextIndex = checkIndex - 1;
  if (prevContextIndex < 0) return {};

  // walk back up to find the closest cached context available
  return getSiblingContext(state, elementId, prevContextIndex);
}

export const elementLayer = createAction('elementLayer');

export const setPosition = createAction('setPosition', (elementId, pageId, position) => ({ pageId, elementId, position }));

export const flushContext = createAction('flushContext');

export const fetchContext = createThunk('fetchContext', ({ dispatch, getState }, index, element, fullRefresh = false) => {
  const chain = get(element, ['ast', 'chain']);
  const invalidIndex = (chain) ? index >= chain.length : true;

  if (!element || !chain || invalidIndex) {
    throw new Error(`Invalid argument index: ${index}`);
  }

  // cache context as the previous index
  const contextIndex = index - 1;
  const contextPath = [element.id, 'expressionContext', contextIndex];

  // set context state to loading
  dispatch(args.setLoading({
    path: contextPath,
  }));

  // function to walk back up to find the closest context available
  const getContext = () => getSiblingContext(getState(), element.id, contextIndex - 1);
  const { index: prevContextIndex, context: prevContextValue } = (fullRefresh !== true) ? getContext() : {};

  // modify the ast chain passed to the interpreter
  const astChain = element.ast.chain.filter((exp, i) => {
    if (prevContextValue != null) return i > prevContextIndex && i < index;
    return i < index;
  });

  // get context data from a partial AST
  return interpretAst({
    ...element.ast,
    chain: astChain,
  }, prevContextValue)
  .then((value) => {
    dispatch(args.setValue({
      path: contextPath,
      value,
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

export const fetchRenderable = createThunk('fetchRenderable', ({ dispatch }, element) => {
  const ast = element.ast || safeElementFromExpression(element.expression);

  dispatch(fetchRenderableWithContext(element, ast, null));
});

export const fetchAllRenderables = createThunk('fetchAllRenderables', ({ dispatch, getState }) => {
  const pages = getPages(getState());
  pages.forEach(page => {
    page.elements.forEach(element => {
      dispatch(fetchRenderable(element));
    });
  });
});

export const removeElement = createThunk('removeElement', ({ dispatch, getState }, elementId, pageId) => {
  const element = getElementById(getState(), elementId, pageId);
  const shouldRefresh = element.filter != null && element.filter.length > 0;

  const _removeElement = createAction('removeElement', (elementId, pageId) => ({ pageId, elementId }));
  dispatch(_removeElement(elementId, pageId));

  if (shouldRefresh) dispatch(fetchAllRenderables());
});

export const setFilter = createThunk('setFilter', ({ dispatch, getState }, filter, elementId, pageId, doRender = true) => {
  const _setFilter = createAction('setFilter');
  dispatch(_setFilter({ filter, elementId, pageId }));

  if (doRender === true) dispatch(fetchAllRenderables());
});

export const setExpression = createThunk('setExpression', setExpressionFn);
function setExpressionFn({ dispatch, getState }, expression, elementId, pageId, doRender = true) {
  // dispatch action to update the element in state
  const _setExpression = createAction('setExpression');
  dispatch(_setExpression({ expression, elementId, pageId }));

  // read updated element from state and fetch renderable
  const updatedElement = getElementById(getState(), elementId, pageId);
  if (doRender === true) dispatch(fetchRenderable(updatedElement));
}

const setAst = createThunk('setAst', ({ dispatch }, ast, element, pageId, doRender = true) => {
  try {
    const expression = toExpression(ast);
    dispatch(setExpression(expression, element.id, pageId, doRender));
  } catch (e) {
    notify.error(e);

    // TODO: remove this, may have been added just to cause a re-render, but why?
    dispatch(setExpression(element.expression, element.id, pageId, doRender));
  }
});

// index here is the top-level argument in the expression. for example in the expression
// demodata().pointseries().plot(), demodata is 0, pointseries is 1, and plot is 2
export const setAstAtIndex = createThunk('setAstAtIndex', ({ dispatch, getState }, index, ast, element, pageId) => {
  const newElement = set(element, ['ast', 'chain', index], ast);
  const newAst = get(newElement, 'ast');

  // fetch renderable using existing context, if available (value is null if not cached)
  const { index: contextIndex, context: contextValue } = getSiblingContext(getState(), element.id, index - 1);

  // if we have a cached context, update the expression, but use cache when updating the renderable
  if (contextValue) {
    // set the expression, but skip the fetchRenderable step
    dispatch(setAst(newAst, element, pageId, false));

    // use context when updating the expression, it will be passed to the intepreter
    const partialAst = {
      ...newAst,
      chain: newAst.chain.filter((exp, i) => {
        if (contextValue) return i > contextIndex;
        return i >= index;
      }),
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
  const { index, argName, value, valueIndex, element, pageId } = args;
  const selector = ['ast', 'chain', index, 'arguments', argName];
  if (valueIndex != null) selector.push(valueIndex);

  const newElement = set(element, selector, value);
  const newAst = get(newElement, ['ast', 'chain', index]);
  dispatch(setAstAtIndex(index, newAst, element, pageId));
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

  dispatch(setAstAtIndex(index, get(newElement, ['ast', 'chain', index]), element, pageId));
});

/*
  payload: element defaults. Eg {expression: 'foo'}
*/
export const addElement = createThunk('addElement', ({ dispatch }, pageId, element) => {
  const newElement = Object.assign({}, getDefaultElement(), omit(element, 'id'));
  const _addElement = createAction('addElement');
  dispatch(_addElement({ pageId, element: newElement }));
  if (element.filter) dispatch(fetchAllRenderables());
  else dispatch(fetchRenderable(newElement));
});
