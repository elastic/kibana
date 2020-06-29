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

import estree from 'estree';

export interface DisallowedSyntaxCheck {
  name: string;
  nodeType: estree.Node['type'] | Array<estree.Node['type']>;
  test?: (n: any) => boolean | void;
}

export const checks: DisallowedSyntaxCheck[] = [
  /**
   * es2015
   */
  // https://github.com/estree/estree/blob/master/es2015.md#functions
  {
    name: '[es2015] generator function',
    nodeType: ['FunctionDeclaration', 'FunctionExpression'],
    test: (n: estree.FunctionDeclaration | estree.FunctionExpression) => !!n.generator,
  },
  // https://github.com/estree/estree/blob/master/es2015.md#forofstatement
  {
    name: '[es2015] for-of statement',
    nodeType: 'ForOfStatement',
  },
  // https://github.com/estree/estree/blob/master/es2015.md#variabledeclaration
  {
    name: '[es2015] let/const variable declaration',
    nodeType: 'VariableDeclaration',
    test: (n: estree.VariableDeclaration) => n.kind === 'let' || n.kind === 'const',
  },
  // https://github.com/estree/estree/blob/master/es2015.md#expressions
  {
    name: '[es2015] `super`',
    nodeType: 'Super',
  },
  // https://github.com/estree/estree/blob/master/es2015.md#expressions
  {
    name: '[es2015] ...spread',
    nodeType: 'SpreadElement',
  },
  // https://github.com/estree/estree/blob/master/es2015.md#arrowfunctionexpression
  {
    name: '[es2015] arrow function expression',
    nodeType: 'ArrowFunctionExpression',
  },
  // https://github.com/estree/estree/blob/master/es2015.md#yieldexpression
  {
    name: '[es2015] `yield` expression',
    nodeType: 'YieldExpression',
  },
  // https://github.com/estree/estree/blob/master/es2015.md#templateliteral
  {
    name: '[es2015] template literal',
    nodeType: 'TemplateLiteral',
  },
  // https://github.com/estree/estree/blob/master/es2015.md#patterns
  {
    name: '[es2015] destructuring',
    nodeType: ['ObjectPattern', 'ArrayPattern', 'AssignmentPattern'],
  },
  // https://github.com/estree/estree/blob/master/es2015.md#classes
  {
    name: '[es2015] class',
    nodeType: [
      'ClassDeclaration',
      'ClassExpression',
      'ClassBody',
      'MethodDefinition',
      'MetaProperty',
    ],
  },

  /**
   * es2016
   */
  {
    name: '[es2016] exponent operator',
    nodeType: 'BinaryExpression',
    test: (n: estree.BinaryExpression) => n.operator === '**',
  },
  {
    name: '[es2016] exponent assignment',
    nodeType: 'AssignmentExpression',
    test: (n: estree.AssignmentExpression) => n.operator === '**=',
  },

  /**
   * es2017
   */
  // https://github.com/estree/estree/blob/master/es2017.md#function
  {
    name: '[es2017] async function',
    nodeType: ['FunctionDeclaration', 'FunctionExpression'],
    test: (n: estree.FunctionDeclaration | estree.FunctionExpression) => n.async,
  },
  // https://github.com/estree/estree/blob/master/es2017.md#awaitexpression
  {
    name: '[es2017] await expression',
    nodeType: 'AwaitExpression',
  },

  /**
   * es2018
   */
  // https://github.com/estree/estree/blob/master/es2018.md#statements
  {
    name: '[es2018] for-await-of statements',
    nodeType: 'ForOfStatement',
    test: (n: estree.ForOfStatement) => n.await,
  },
  // https://github.com/estree/estree/blob/master/es2018.md#expressions
  {
    name: '[es2018] object spread properties',
    nodeType: 'ObjectExpression',
    test: (n: estree.ObjectExpression) => n.properties.some((p) => p.type === 'SpreadElement'),
  },
  // https://github.com/estree/estree/blob/master/es2018.md#template-literals
  {
    name: '[es2018] tagged template literal with invalid escape',
    nodeType: 'TemplateElement',
    test: (n: estree.TemplateElement) => n.value.cooked === null,
  },
  // https://github.com/estree/estree/blob/master/es2018.md#patterns
  {
    name: '[es2018] rest properties',
    nodeType: 'ObjectPattern',
    test: (n: estree.ObjectPattern) => n.properties.some((p) => p.type === 'RestElement'),
  },

  /**
   * es2019
   */
  // https://github.com/estree/estree/blob/master/es2019.md#catchclause
  {
    name: '[es2019] catch clause without a binding',
    nodeType: 'CatchClause',
    test: (n: estree.CatchClause) => !n.param,
  },

  /**
   * es2020
   */
  // https://github.com/estree/estree/blob/master/es2020.md#bigintliteral
  {
    name: '[es2020] bigint literal',
    nodeType: 'Literal',
    test: (n: estree.Literal) => typeof n.value === 'bigint',
  },

  /**
   * webpack transforms import/export in order to support tree shaking and async imports
   *
   * // https://github.com/estree/estree/blob/master/es2020.md#importexpression
   * {
   *   name: '[es2020] import expression',
   *   nodeType: 'ImportExpression',
   * },
   * // https://github.com/estree/estree/blob/master/es2020.md#exportalldeclaration
   * {
   *   name: '[es2020] export all declaration',
   *   nodeType: 'ExportAllDeclaration',
   * },
   *
   */
];

export const checksByNodeType = new Map<estree.Node['type'], DisallowedSyntaxCheck[]>();
for (const check of checks) {
  const nodeTypes = Array.isArray(check.nodeType) ? check.nodeType : [check.nodeType];
  for (const nodeType of nodeTypes) {
    if (!checksByNodeType.has(nodeType)) {
      checksByNodeType.set(nodeType, []);
    }
    checksByNodeType.get(nodeType)!.push(check);
  }
}
