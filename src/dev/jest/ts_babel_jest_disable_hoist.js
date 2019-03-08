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

const visitor = {
  // Babel-jest hoisting to the top very `jest.mock` call so make it
  // impossible to reuse variables defined outside of them, even the ones
  // prefixed with `mock` contrary to what is described in the documentation.
  // The idea behind this plugin is to hoist the `mock` prefixed variables
  // found in the babel-jest parsed tests in order to be able to use them
  // along with the jest.mock calls.
  // VariableDeclaration(path) {
  //   const varNode = path && path.node;
  //   const kind = varNode && varNode.kind;
  //   const declarations = varNode && varNode.declarations;
  //
  //   if (!kind || !declarations) {
  //     return;
  //   }
  //
  //   // Return as soon as we found a mock prefixed var
  //   const foundMockVarDeclaration = declarations.some((decl) => {
  //     const declName = decl && decl.id && decl.id.name;
  //     return /^mock/i.test(declName);
  //   });
  //
  //   // If none mock prefixed var was found, just return
  //   if (!foundMockVarDeclaration) {
  //     return;
  //   }
  //
  //   // If a mock prefixed var was found, hoist it with Infinity
  //   // The same behaviour is found on babel-plugin-jest-hoist
  //   // https://github.com/facebook/jest/blob/master/packages/babel-plugin-jest-hoist/src/index.ts#L180
  //   path.node._blockHoist = Infinity;
  // },
};

module.exports = () => {
  return { visitor };
};
