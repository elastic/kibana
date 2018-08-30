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

import { dirname, extname, isAbsolute } from 'path';
import { readFileSync } from 'fs';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

function canRequire(build, entry) {
  try {
    const resolvedEntry = require.resolve(entry);

    if (resolvedEntry !== entry) {
      // The entry is resolved and we can
      // just return it
      return resolvedEntry;
    }

    // We will try to test if we can resolve
    // this entry against the node_modules path.
    // An error will be thrown and we'll return false
    // in case the entry wasn't found on node_modules
    return require.resolve(build.resolvePath('node_modules', entry));
  } catch (e) {
    return false;
  }
}

function getSingleFileDependencies(filePath) {
  // Retrieve native nodeJS modules
  const natives = process.binding('natives');
  const dependencies = [];

  // Don't parse any other files than .js ones
  if (extname(filePath) !== '.js') {
    return dependencies;
  }

  // Read the file
  const content = readFileSync(filePath, { encoding: 'utf8' });

  // Parse and get the code AST
  // All the babel parser plugins
  // were enabled
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

  // Visitors to traverse and found dependencies
  // raw values on require + require.resolve
  const visitors = {
    CallExpression: ({ node }) => {
      // This was built based on two main tools: an ast explorer and the
      // main docs for the Esprima
      //
      // https://astexplorer.net
      // https://esprima.readthedocs.io/en/latest/syntax-tree-format.html
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

  // Loop through the code AST with
  // the defined visitors
  traverse(ast, visitors);

  // Filter out node native modules from the result
  return dependencies.filter(dep => !natives[dep]);
}

async function getRawDependencies(build, entries, entriesMap = {}, deps = {}, wasParsed = {}) {
  return new Promise((resolve) => {
    if (!entries.length) {
      return resolve(Object.keys(deps));
    }

    const dep = entries.shift();
    if (typeof dep !== 'string' || wasParsed[dep]) {
      return process.nextTick(async () => {
        resolve(await getRawDependencies(build, entries, entriesMap, deps, wasParsed));
      });
    }

    wasParsed[dep] = true;

    const newEntries = getSingleFileDependencies(dep).reduce((filteredEntries, entry) => {
      const absEntryPath = build.resolvePath(dirname(dep), entry);
      const requiredPath = canRequire(build, absEntryPath);
      const relativeFile = !isAbsolute(entry);
      const requiredRelativePath = canRequire(build, entry);
      const isNodeModuleDep = relativeFile && !requiredPath && requiredRelativePath;
      const isNewEntry = relativeFile && requiredPath;

      if (isNodeModuleDep) {
        deps[entry] = true;
        if (!entriesMap[requiredRelativePath]) {
          filteredEntries.push(requiredRelativePath);
          entriesMap[requiredRelativePath] = true;
        }
      }

      if (isNewEntry && !wasParsed[requiredPath]) {
        if (!entriesMap[requiredPath]) {
          filteredEntries.push(requiredPath);
          entriesMap[requiredPath] = true;
        }
      }

      return filteredEntries;
    }, []);

    return process.nextTick(async () => {
      resolve(await getRawDependencies(build, [...entries, ...newEntries], entriesMap, deps, wasParsed));
    });
  });
}

export async function getDependencies(build, entries) {
  // Test each entry against canRequire function
  const sanitizedEntries = entries.map(entry => canRequire(build, entry));

  // Retrieve the raw dependencies from the provided
  // code entries
  const serverDeps = await getRawDependencies(build, sanitizedEntries);

  // Delete repeated dependencies by mapping them to
  // the top level path
  const baseServerDepsMap = serverDeps.reduce((baseDeps, dep) => {
    const calculateTLDep = (inputDep, outputDep = '') => {
      // The path separator will be always the forward slash
      // as at this point we only have the found entries into
      // the provided source code entries where we just use it
      const pathSeparator = '/';
      const depSplitPaths = inputDep.split(pathSeparator);
      const firstPart = depSplitPaths.shift();
      const outputDepFirstArgAppend = outputDep ? pathSeparator : '';

      outputDep += `${outputDepFirstArgAppend}${firstPart}`;

      if (firstPart.charAt(0) !== '@') {
        return outputDep;
      }

      return calculateTLDep(depSplitPaths.join(pathSeparator, outputDep));
    };

    const tlDEP = calculateTLDep(dep);
    baseDeps[tlDEP] = true;

    return baseDeps;
  }, {});

  return Object.keys(baseServerDepsMap);
}
