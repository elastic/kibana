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
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Parameter} Parameter */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.TSParameterProperty} TSParameterProperty */

/**
 * @param {Parameter} param
 * @returns {param is TSParameterProperty}
 */
function isTsParameterProperty(param) {
  return param.type === esTypes.TSParameterProperty;
}

/**
 * @param {string} arg
 */
const errorMsg = (arg) =>
  `The constructor argument "${arg}" can't be used in a class property intializer, define the property in the constructor instead`;

/** @type {Rule} */
module.exports = {
  meta: {
    schema: [],
  },
  create: (context) => ({
    ClassBody(_) {
      const node = /** @type {ClassBody} */ (_);

      const constructor = node.body.find(
        (n) => n.type === esTypes.MethodDefinition && n.kind === 'constructor'
      );

      if (!constructor || constructor.type !== esTypes.MethodDefinition) {
        return;
      }

      const constructorArgProps = constructor.value.params
        .filter(isTsParameterProperty)
        .map((p) => {
          if (p.parameter.type === esTypes.Identifier) {
            return p.parameter.name;
          }

          if (
            p.parameter.type === esTypes.AssignmentPattern &&
            p.parameter.left.type === esTypes.Identifier
          ) {
            return p.parameter.left.name;
          }
        });

      if (!constructorArgProps.length) {
        return;
      }

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
            return traverse.SKIP;
          }

          if (
            node.type === esTypes.MemberExpression &&
            node.object.type === esTypes.ThisExpression &&
            node.property.type === esTypes.Identifier &&
            node.property.name &&
            constructorArgProps.includes(node.property.name)
          ) {
            context.report({
              message: errorMsg(node.property.name),
              loc: node.property.loc,
            });
          }
        };

        traverse(context, prop, visitor);
      }
    },
  }),
};
