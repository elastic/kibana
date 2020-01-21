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

module.exports = {
  create: context => {
    const sourceCode = context.getSourceCode();

    const variableDeclarators = sourceCode.ast.body.reduce((acc, item) => {
      if (item.type === 'VariableDeclaration') {
        acc = [...acc, item.declarations[0]];
      }

      if (
        item.type === 'ExportNamedDeclaration' &&
        item.declaration &&
        item.declaration.type === 'VariableDeclaration'
      ) {
        acc = [...acc, item.declaration.declarations[0]];
      }

      return acc;
    }, []);

    const memoComponents = variableDeclarators.reduce((acc, item) => {
      const init = item.init;

      if (init) {
        if (init.type === 'BinaryExpression' && init.left.type === 'BinaryExpression') {
          if (
            init.left.left.type === 'MemberExpression' &&
            init.left.left.object.type === 'Identifier' &&
            init.left.left.object.name === 'React' &&
            init.left.left.property.type === 'Identifier' &&
            init.left.left.property.name === 'memo' &&
            item.id.type === 'Identifier'
          ) {
            // console.log("React.memo", item.id.name);
            acc = [...acc, item.id.name];
          }

          if (
            init.left.left.type === 'Identifier' &&
            init.left.left.name === 'memo' &&
            item.id.type === 'Identifier'
          ) {
            // console.log("memo", item.id.name);
            acc = [...acc, item.id.name];
          }
        }

        if (init.type === 'CallExpression') {
          if (
            init.callee.type === 'MemberExpression' &&
            init.callee.object.type === 'Identifier' &&
            init.callee.object.name === 'React' &&
            init.callee.property.type === 'Identifier' &&
            init.callee.property.name === 'memo' &&
            item.id.type === 'Identifier'
          ) {
            // console.log("React.memo", item.id.name);
            acc = [...acc, item.id.name];
          }

          if (
            init.callee.type === 'Identifier' &&
            init.callee.name === 'memo' &&
            item.id.type === 'Identifier'
          ) {
            // console.log("memo", item.id.name);
            acc = [...acc, item.id.name];
          }
        }
      }

      return acc;
    }, []);

    return {
      // "ExpressionStatement > MemberExpression > Identifier.property[name='displayName']": (
      ExpressionStatement: node => {
        // console.log("node", node.expression);
        const expression = node.expression; // AssignmentExpression

        if (
          expression.left &&
          expression.left.property &&
          expression.left.property.name === 'displayName' &&
          memoComponents.includes(expression.left.object.name)
        ) {
          context.report({
            node,
            message: "Do not set 'displayName' on memo() component",
          });
        }
      },
    };
  },
};
