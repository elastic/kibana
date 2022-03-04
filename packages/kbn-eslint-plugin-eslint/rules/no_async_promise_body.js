/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { parseExpression } = require('@babel/parser');
const { default: generate } = require('@babel/generator');
const tsEstree = require('@typescript-eslint/typescript-estree');
const traverse = require('eslint-traverse');
const esTypes = tsEstree.AST_NODE_TYPES;
const babelTypes = require('@babel/types');

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Expression} Expression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.ArrowFunctionExpression} ArrowFunctionExpression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.FunctionExpression} FunctionExpression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.NewExpression} NewExpression */

const ERROR_MSG =
  'Passing an async function to the Promise constructor leads to a hidden promise being created and prevents handling rejections';

/**
 * @param {Expression} node
 */
const isPromise = (node) => node.type === esTypes.Identifier && node.name === 'Promise';

/**
 * @param {Expression} node
 * @returns {node is ArrowFunctionExpression | FunctionExpression}
 */
const isFunc = (node) =>
  node.type === esTypes.ArrowFunctionExpression || node.type === esTypes.FunctionExpression;

/**
 * @param {any} context
 * @param {ArrowFunctionExpression | FunctionExpression} node
 */
const isFuncBodySafe = (context, node) => {
  // if the body isn't wrapped in a blockStatement it can't have a try/catch at the root
  if (node.body.type !== esTypes.BlockStatement) {
    return false;
  }

  // when the entire body is wrapped in a try/catch it is the only node
  if (node.body.body.length !== 1) {
    return false;
  }

  const tryNode = node.body.body[0];
  // ensure we have a try node with a handler
  if (tryNode.type !== esTypes.TryStatement || !tryNode.handler) {
    return false;
  }

  // ensure the handler doesn't throw
  let hasThrow = false;
  traverse(context, tryNode.handler, (path) => {
    if (path.node.type === esTypes.ThrowStatement) {
      hasThrow = true;
      return traverse.STOP;
    }
  });
  return !hasThrow;
};

/**
 * @param {string} code
 */
const wrapFunctionInTryCatch = (code) => {
  // parse the code with babel so we can mutate the AST
  const ast = parseExpression(code, {
    plugins: ['typescript', 'jsx'],
  });

  // validate that the code reperesents an arrow or function expression
  if (!babelTypes.isArrowFunctionExpression(ast) && !babelTypes.isFunctionExpression(ast)) {
    throw new Error('expected function to be an arrow or function expression');
  }

  // ensure that the function receives the second argument, and capture its name if already defined
  let rejectName = 'reject';
  if (ast.params.length === 0) {
    ast.params.push(babelTypes.identifier('resolve'), babelTypes.identifier(rejectName));
  } else if (ast.params.length === 1) {
    ast.params.push(babelTypes.identifier(rejectName));
  } else if (ast.params.length === 2) {
    if (babelTypes.isIdentifier(ast.params[1])) {
      rejectName = ast.params[1].name;
    } else {
      throw new Error('expected second param of promise definition function to be an identifier');
    }
  }

  // ensure that the body of the function is a blockStatement
  let block = ast.body;
  if (!babelTypes.isBlockStatement(block)) {
    block = babelTypes.blockStatement([babelTypes.returnStatement(block)]);
  }

  // redefine the body of the function as a new blockStatement containing a tryStatement
  // which catches errors and forwards them to reject() when caught
  ast.body = babelTypes.blockStatement([
    // try {
    babelTypes.tryStatement(
      block,
      // catch (error) {
      babelTypes.catchClause(
        babelTypes.identifier('error'),
        babelTypes.blockStatement([
          // reject(error)
          babelTypes.expressionStatement(
            babelTypes.callExpression(babelTypes.identifier(rejectName), [
              babelTypes.identifier('error'),
            ])
          ),
        ])
      )
    ),
  ]);

  return generate(ast).code;
};

/** @type {Rule} */
module.exports = {
  meta: {
    fixable: 'code',
    schema: [],
  },
  create: (context) => ({
    NewExpression(_) {
      const node = /** @type {NewExpression} */ (_);

      // ensure we are newing up a promise with a single argument
      if (!isPromise(node.callee) || node.arguments.length !== 1) {
        return;
      }

      const func = node.arguments[0];
      // ensure the argument is an arrow or function expression and is async
      if (!isFunc(func) || !func.async) {
        return;
      }

      // body must be a blockStatement, try/catch can't exist outside of a block
      if (!isFuncBodySafe(context, func)) {
        context.report({
          message: ERROR_MSG,
          loc: func.loc,
          fix(fixer) {
            const source = context.getSourceCode();
            return fixer.replaceText(func, wrapFunctionInTryCatch(source.getText(func)));
          },
        });
      }
    },
  }),
};
