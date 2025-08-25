/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = function rewriteRequireToImport({ types: t }) {
  function isRequireCall(node) {
    return (
      t.isCallExpression(node) &&
      t.isIdentifier(node.callee, { name: 'require' }) &&
      node.arguments.length === 1 &&
      t.isStringLiteral(node.arguments[0])
    );
  }

  return {
    name: 'rewrite-require-to-import',
    visitor: {
      // Handle: require('mod'); at the top-level
      ExpressionStatement(path) {
        const { node, parent } = path;
        if (!t.isProgram(parent)) return;

        if (isRequireCall(node.expression)) {
          const source = node.expression.arguments[0];
          path.replaceWith(t.importDeclaration([], source)); // import 'mod';
        }
      },

      // Handle variable declarations containing require() at the top-level
      VariableDeclaration(path) {
        const { node, parent } = path;

        if (!t.isProgram(parent)) return; // only transform top-level

        const newImports = [];
        const remainingDeclarators = [];

        for (const decl of node.declarations) {
          const init = decl.init;

          if (!isRequireCall(init)) {
            // keep as-is
            remainingDeclarators.push(decl);
            continue;
          }

          const source = init.arguments[0]; // StringLiteral

          if (t.isIdentifier(decl.id)) {
            // const x = require('mod') -> import x from 'mod';
            newImports.push(t.importDeclaration([t.importDefaultSpecifier(decl.id)], source));
            // no remaining declarator needed
          } else if (t.isObjectPattern(decl.id)) {
            // const { a, b } = require('mod')
            // -> import * as _mod from 'mod'; const { a, b } = _mod;
            const ns = path.scope.generateUidIdentifierBasedOnNode(source, 'mod');
            newImports.push(t.importDeclaration([t.importNamespaceSpecifier(ns)], source));
            remainingDeclarators.push(t.variableDeclarator(decl.id, ns));
          } else {
            // Unhandled pattern (e.g., ArrayPattern) -> keep as-is
            remainingDeclarators.push(decl);
          }
        }

        if (newImports.length === 0) return;

        if (remainingDeclarators.length > 0) {
          path.replaceWithMultiple([
            ...newImports,
            t.variableDeclaration(node.kind, remainingDeclarators),
          ]);
        } else {
          path.replaceWithMultiple(newImports);
        }
      },
    },
  };
};
