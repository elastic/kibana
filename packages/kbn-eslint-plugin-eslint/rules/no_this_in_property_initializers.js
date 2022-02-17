/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const tsEstree = require('@typescript-eslint/typescript-estree');
const traverse = require('eslint-traverse');
const esTypes = tsEstree.AST_NODE_TYPES;

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Node} Node */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.ClassBody} ClassBody */

/**
 * @param {string} arg
 */
const ERROR_MSG = `"this" is not fully initialized in class property intializers, define the value for this property in the constructor instead`;

/** @type {Rule} */
module.exports = {
  meta: {
    schema: [],
  },
  create: (context) => ({
    ClassBody(_) {
      const node = /** @type {ClassBody} */ (_);

      for (const prop of node.body) {
        if (prop.type !== esTypes.PropertyDefinition) {
          continue;
        }

        const visitor = (path) => {
          /** @type {Node} node */
          const node = path.node;

          if (
            node.type === esTypes.FunctionExpression ||
            node.type === esTypes.ArrowFunctionExpression
          ) {
            return traverse.STOP;
          }

          if (
            node.type === esTypes.ThisExpression &&
            node.parent?.type !== esTypes.MemberExpression
          ) {
            context.report({
              message: ERROR_MSG,
              loc: node.loc,
            });
          }
        };

        traverse(context, prop, visitor);
      }
    },
  }),
};
