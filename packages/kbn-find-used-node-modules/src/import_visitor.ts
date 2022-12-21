/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as T from '@babel/types';
import type { Visitor } from '@babel/core';

/**
 * @notice
 *
 * This product has relied on ASTExplorer that is licensed under MIT.
 */

// AST check for require expressions
const isRequire = ({ callee }: T.CallExpression) =>
  T.isIdentifier(callee) && callee.name === 'require';

// AST check for require.resolve expressions
const isRequireResolve = ({ callee }: T.CallExpression) =>
  T.isMemberExpression(callee) &&
  T.isIdentifier(callee.object) &&
  callee.object.name === 'require' &&
  T.isIdentifier(callee.property) &&
  callee.property.name === 'resolve';

/**
 * Create a Babel AST visitor that will write import requests into the passed array
 */
export function importVisitor(importRequests: string[]): Visitor {
  // This was built with help on an ast explorer and some ESTree docs
  // like the babel parser ast spec and the main docs for the Esprima
  // which is a complete and useful docs for the ESTree spec.
  //
  // https://astexplorer.net
  // https://github.com/babel/babel/blob/master/packages/babel-parser/ast/spec.md
  // https://esprima.readthedocs.io/en/latest/syntax-tree-format.html
  // https://github.com/estree/estree

  // Visitors to traverse and find dependencies
  return {
    // raw values on require + require.resolve
    CallExpression: ({ node }) => {
      if (isRequire(node) || isRequireResolve(node)) {
        const nodeArguments = node.arguments;
        const reqArg = Array.isArray(nodeArguments) ? nodeArguments.shift() : null;

        if (!reqArg) {
          return;
        }

        if (reqArg.type === 'StringLiteral') {
          importRequests.push(reqArg.value);
        }
      }
    },

    // raw values on import
    ImportDeclaration: ({ node }) => {
      // Get string values from import expressions
      const importSource = node.source;
      importRequests.push(importSource.value);
    },

    // raw values on export from
    ExportNamedDeclaration: ({ node }) => {
      // Get string values from export from expressions
      if (node.source) {
        importRequests.push(node.source.value);
      }
    },

    // raw values on export * from
    ExportAllDeclaration: ({ node }) => {
      const exportAllFromSource = node.source;
      importRequests.push(exportAllFromSource.value);
    },
  };
}
