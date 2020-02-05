/* eslint-disable @kbn/eslint/require-license-header */

import { matches } from 'lodash';

/* @notice
 *
 * This product has relied on ASTExplorer that is licensed under MIT.
 */
export function dependenciesVisitorsGenerator(dependenciesAcc) {
  return (() => {
    // This was built with help on an ast explorer and some ESTree docs
    // like the babel parser ast spec and the main docs for the Esprima
    // which is a complete and useful docs for the ESTree spec.
    //
    // https://astexplorer.net
    // https://github.com/babel/babel/blob/master/packages/babel-parser/ast/spec.md
    // https://esprima.readthedocs.io/en/latest/syntax-tree-format.html
    // https://github.com/estree/estree
    return {
      // Visitors to traverse and found dependencies
      // raw values on require + require.resolve
      CallExpression: ({ node }) => {
        // AST check for require expressions
        const isRequire = node => {
          return matches({
            callee: {
              type: 'Identifier',
              name: 'require',
            },
          })(node);
        };

        // AST check for require.resolve expressions
        const isRequireResolve = node => {
          return matches({
            callee: {
              type: 'MemberExpression',
              object: {
                type: 'Identifier',
                name: 'require',
              },
              property: {
                type: 'Identifier',
                name: 'resolve',
              },
            },
          })(node);
        };

        // Get string values inside the expressions
        // whether they are require or require.resolve
        if (isRequire(node) || isRequireResolve(node)) {
          const nodeArguments = node.arguments;
          const reqArg = Array.isArray(nodeArguments) ? nodeArguments.shift() : null;

          if (!reqArg) {
            return;
          }

          if (reqArg.type === 'StringLiteral') {
            dependenciesAcc.push(reqArg.value);
          }
        }
      },
      // Visitors to traverse and found dependencies
      // raw values on import
      ImportDeclaration: ({ node }) => {
        // AST check for supported import expressions
        const isImport = node => {
          return matches({
            type: 'ImportDeclaration',
            source: {
              type: 'StringLiteral',
            },
          })(node);
        };

        // Get string values from import expressions
        if (isImport(node)) {
          const importSource = node.source;
          dependenciesAcc.push(importSource.value);
        }
      },
      // Visitors to traverse and found dependencies
      // raw values on export from
      ExportNamedDeclaration: ({ node }) => {
        // AST check for supported export from expressions
        const isExportFrom = node => {
          return matches({
            type: 'ExportNamedDeclaration',
            source: {
              type: 'StringLiteral',
            },
          })(node);
        };

        // Get string values from export from expressions
        if (isExportFrom(node)) {
          const exportFromSource = node.source;
          dependenciesAcc.push(exportFromSource.value);
        }
      },
      // Visitors to traverse and found dependencies
      // raw values on export * from
      ExportAllDeclaration: ({ node }) => {
        // AST check for supported export * from expressions
        const isExportAllFrom = node => {
          return matches({
            type: 'ExportAllDeclaration',
            source: {
              type: 'StringLiteral',
            },
          })(node);
        };

        // Get string values from export * from expressions
        if (isExportAllFrom(node)) {
          const exportAllFromSource = node.source;
          dependenciesAcc.push(exportAllFromSource.value);
        }
      },
    };
  })();
}
