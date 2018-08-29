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

import { extname } from 'path';
import { readFileSync } from 'fs';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

const canRequire = (entry) => {
  try {
    let resolvedEntry = require.resolve(entry);

    if (resolvedEntry === entry) {
      resolvedEntry = require.resolve(build.resolvePath('node_modules', entry));
    }

    return resolvedEntry;

  } catch (e) {
    return false;
  }
};

const getDepsFromFile = (filePath) => {
  const natives = process.binding('natives');
  const dependencies = [];

  // Don't parse any other files than .js ones
  if (extname(filePath) !== '.js') {
    return dependencies;
  }

  // Read the file
  const content = readFileSync(filePath, { encoding: 'utf8' });

  // Parse and get AST
  const ast = parser.parse(content, {
    sourceType: 'unambiguous',
    plugins: [
      'asyncGenerators',
      'classProperties',
      'dynamicImport',
      'exportDefaultFrom',
      'exportNamespaceFrom',
      'objectRestSpread',
      'throwExpressions'
    ]
  });

  // Traverse and found dependencies on require + require.resolve
  const visitors = {
    CallExpression: ({ node }) => {
      const isRequire = (node) => {
        return node.callee && node.callee.type === 'Identifier' && node.callee.name === 'require';
      };

      const isRequireResolve = (node) => {
        return node.callee && node.callee.type === 'MemberExpression' && node.callee.object
          && node.callee.object.type === 'Identifier' && node.callee.object.name === 'require'
          && node.callee.property && node.callee.property.type === 'Identifier'
          && node.callee.property.name === 'resolve';
      };

      if (isRequire(node) || isRequireResolve(node)) {
        const nodeArguments = node.arguments;
        const reqArg = Array.isArray(nodeArguments) ? nodeArguments.shift() : null;

        if (!reqArg) {
          return;
        }

        if (reqArg.type === 'StringLiteral') {
          dependencies.push(reqArg.value);
        }
      }
    }
  };
  traverse(ast, visitors);

  // Filter node native modules from the result
  return dependencies.filter(dep => !natives[dep]);
};
