/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * @notice
 *
 * This product has relied on ASTExplorer that is licensed under MIT
 * and Esprima documentation for the ESTree licensed under BSD-2-Clause.
 */
export function dependenciesVisitorsGenerator(dependenciesAcc) {
  return (() => {
    // This was built based on two main tools: an ast explorer and the
    // main docs for the Esprima which is a complete and useful docs
    // for the ESTree spec.
    //
    // https://astexplorer.net
    // https://esprima.readthedocs.io/en/latest/syntax-tree-format.html
    // https://github.com/estree/estree
    return {
      // Visitors to traverse and found dependencies
      // raw values on require + require.resolve
      CallExpression: ({ node }) => {
        // AST check for require expressions
        const isRequire = (node) => {
          return node.callee && node.callee.type === 'Identifier' && node.callee.name === 'require';
        };

        // AST check for require.resolve expressions
        const isRequireResolve = (node) => {
          return node.callee && node.callee.type === 'MemberExpression' && node.callee.object
            && node.callee.object.type === 'Identifier' && node.callee.object.name === 'require'
            && node.callee.property && node.callee.property.type === 'Identifier'
            && node.callee.property.name === 'resolve';
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
        const isImport = (node) => {
          return node.type === 'ImportDeclaration' && node.source && node.source.type === 'StringLiteral';
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
        const isExportFrom = (node) => {
          return node.type === 'ExportNamedDeclaration' && node.source && node.source.type === 'StringLiteral';
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
        const isExportAllFrom = (node) => {
          return node.type === 'ExportAllDeclaration' && node.source && node.source.type === 'StringLiteral';
        };

        // Get string values from export * from expressions
        if (isExportAllFrom(node)) {
          const exportAllFromSource = node.source;
          dependenciesAcc.push(exportAllFromSource.value);
        }
      }
    };
  })();
}
