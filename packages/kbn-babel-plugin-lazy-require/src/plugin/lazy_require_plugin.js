/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// /**
//  * @typedef {import('@babel/core').types} t
//  * @typedef {import('@babel/core').PluginObj} PluginObj
//  */

// /**
//  * Transforms require() calls to lazy getters.
//  * Based on: https://github.com/mhassan1/babel-plugin-lazy-require
//  *
//  * Transforms:
//  *   const foo = require('foo');
//  *   foo.bar();
//  *
//  * Into:
//  *   const _foo = { initialized: false };
//  *   const _imports = {
//  *     get foo() {
//  *       if (!_foo.initialized) {
//  *         _foo.value = require('foo');
//  *         _foo.initialized = true;
//  *       }
//  *       return _foo.value;
//  *     }
//  *   };
//  *   _imports.foo.bar();
//  */
// /**
//  * @param {{ types: t }} babel
//  * @returns {PluginObj}
//  */
// function lazyRequirePlugin({ types: t }) {
//   const DISABLED = process.env.KIBANA_DISABLE_LAZY_REQUIRE === '1';

//   function hasRequireCall(init) {
//     return (
//       init &&
//       t.isCallExpression(init) &&
//       t.isIdentifier(init.callee, { name: 'require' }) &&
//       init.arguments.length === 1 &&
//       t.isStringLiteral(init.arguments[0])
//     );
//   }

//   const requireDeclarationVisitor = {
//     VariableDeclaration(path) {
//       // Only handle top-level declarations
//       if (!t.isProgram(path.parent)) {
//         return;
//       }

//       path.traverse(
//         {
//           VariableDeclarator(path) {
//             if (!hasRequireCall(path.node.init)) {
//               return;
//             }

//             const id = path.node.id;
//             if (!t.isIdentifier(id)) {
//               return;
//             }

//             // Store declaration info
//             this.declarations.set(id.name, {
//               requireString: path.node.init.arguments[0].value,
//               isConst: path.parent.kind === 'const',
//             });

//             // Remove the original declaration
//             path.remove();
//           },
//         },
//         { declarations: this.declarations }
//       );
//     },
//   };

//   const requireUsagesVisitor = {
//     Identifier(path) {
//       // Skip declarations
//       if (
//         (t.isVariableDeclarator(path.parent) && path.parent.id === path.node) ||
//         (t.isFunctionDeclaration(path.parent) && path.parent.id === path.node)
//       ) {
//         return;
//       }

//       // Skip property keys in object literals
//       if (
//         (t.isObjectProperty(path.parent) || t.isObjectMethod(path.parent)) &&
//         path.parent.key === path.node
//       ) {
//         return;
//       }

//       // Skip member expression properties (e.g., the `bar` in `foo.bar`)
//       if (
//         t.isMemberExpression(path.parent) &&
//         path.parent.property === path.node &&
//         !path.parent.computed
//       ) {
//         return;
//       }

//       // Check if this identifier is one we're tracking
//       const binding = path.scope.getBinding(path.node.name);
//       if (binding && binding.scope !== this.requireScope) {
//         return;
//       }

//       if (!this.declarations.has(path.node.name)) {
//         return;
//       }

//       // Replace with _imports.moduleName
//       path.replaceWith(t.memberExpression(this.importsVar, t.identifier(path.node.name)));
//       path.skip();
//     },
//   };

//   return {
//     name: 'kbn-lazy-require-transform',
//     visitor: {
//       Program(path) {
//         if (DISABLED) {
//           return;
//         }

//         const declarations = new Map();
//         const importsVar = path.scope.generateUidIdentifier('imports');

//         // Collect require declarations
//         path.traverse(requireDeclarationVisitor, { declarations });

//         if (declarations.size === 0) {
//           return;
//         }

//         // Replace usages with _imports.moduleName
//         path.traverse(requireUsagesVisitor, {
//           declarations,
//           requireScope: path.scope,
//           importsVar,
//         });

//         // Create storage variables for each module
//         const variableDeclarations = [];
//         for (const [name] of declarations) {
//           const identifier = path.scope.generateUidIdentifier(name);
//           declarations.get(name).identifier = identifier;
//           variableDeclarations.push(
//             t.variableDeclaration('const', [
//               t.variableDeclarator(
//                 identifier,
//                 t.objectExpression([
//                   t.objectProperty(t.identifier('initialized'), t.booleanLiteral(false)),
//                 ])
//               ),
//             ])
//           );
//         }
//         variableDeclarations.reverse();

//         // Create getter properties for the _imports object
//         const properties = [];
//         for (const [name, { identifier, requireString, isConst }] of declarations) {
//           const nameIdentifier = t.identifier(name);
//           const initializedMember = t.memberExpression(identifier, t.identifier('initialized'));
//           const valueMember = t.memberExpression(identifier, t.identifier('value'));
//           const requireExpression = t.callExpression(t.identifier('require'), [
//             t.stringLiteral(requireString),
//           ]);

//           // Add getter
//           properties.push(
//             t.objectMethod(
//               'get',
//               nameIdentifier,
//               [],
//               t.blockStatement([
//                 t.ifStatement(
//                   t.unaryExpression('!', initializedMember),
//                   t.blockStatement([
//                     t.expressionStatement(
//                       t.assignmentExpression('=', valueMember, requireExpression)
//                     ),
//                     t.expressionStatement(
//                       t.assignmentExpression('=', initializedMember, t.booleanLiteral(true))
//                     ),
//                   ])
//                 ),
//                 t.returnStatement(valueMember),
//               ])
//             )
//           );

//           // Add setter for non-const declarations
//           if (!isConst) {
//             const valueIdentifier = t.identifier('value');
//             properties.push(
//               t.objectMethod(
//                 'set',
//                 nameIdentifier,
//                 [valueIdentifier],
//                 t.blockStatement([
//                   t.ifStatement(
//                     t.unaryExpression('!', initializedMember),
//                     t.blockStatement([
//                       t.expressionStatement(
//                         t.assignmentExpression('=', valueMember, requireExpression)
//                       ),
//                       t.expressionStatement(
//                         t.assignmentExpression('=', initializedMember, t.booleanLiteral(true))
//                       ),
//                     ])
//                   ),
//                   t.expressionStatement(t.assignmentExpression('=', valueMember, valueIdentifier)),
//                 ])
//               )
//             );
//           }
//         }

//         // Insert _imports object at the top
//         path.unshiftContainer(
//           'body',
//           t.variableDeclaration('const', [
//             t.variableDeclarator(importsVar, t.objectExpression(properties)),
//           ])
//         );

//         // Insert storage variables at the top
//         for (const declaration of variableDeclarations) {
//           path.unshiftContainer('body', declaration);
//         }
//       },
//     },
//   };
// }

// module.exports = lazyRequirePlugin;

Object.defineProperty(exports, '__esModule', {
  value: true,
});

exports.default = function ({ types: t }) {
  function hasRequireCall(init) {
    return (
      init &&
      t.isIdentifier(init.callee, { name: 'require' }) &&
      init.arguments.length === 1 &&
      t.isLiteral(init.arguments[0])
    );
  }

  const requireDeclarationVisitor = {
    VariableDeclaration(path) {
      // TODO: support nonglobal declarations
      if (!t.isProgram(path.parent)) {
        // We don't care about nonglobal declarations (for now)
        return;
      }

      path.traverse(
        {
          VariableDeclarator(path) {
            let remove = false;

            const addDeclarations = (settings) => {
              if (t.isIdentifier(path.node.id)) {
                this.declarations.set(path.node.id.name, { ...settings });
                remove = true;
              } else if (
                t.isObjectPattern(path.node.id) &&
                path.node.id.properties.every(
                  (prop) =>
                    t.isObjectProperty(prop) &&
                    t.isIdentifier(prop.key) &&
                    t.isIdentifier(prop.value)
                )
              ) {
                for (const prop of path.node.id.properties) {
                  this.declarations.set(prop.value.name, {
                    ...settings,
                    propertyName: prop.key.name,
                  });
                  remove = true;
                }
              }
            };

            if (!t.isCallExpression(path.node.init)) {
              return;
            }

            if (hasRequireCall(path.node.init)) {
              addDeclarations({
                node: path.node,
                isConst: path.parent.kind === 'const',
                requireString: path.node.init.arguments[0].value,
              });
            } else if (
              path.node.init.arguments.length === 1 &&
              hasRequireCall(path.node.init.arguments[0])
            ) {
              addDeclarations({
                node: path.node,
                isConst: path.parent.kind === 'const',
                outerFunc: path.node.init.callee,
                requireString: path.node.init.arguments[0].arguments[0].value,
              });
            }

            // Since this is going to be replaced, we don't need it any more
            if (remove) {
              path.remove();
            }
          },
        },
        { declarations: this.declarations }
      );
    },
  };

  const requireUsagesVisitor = {
    Identifier(path) {
      // We don't care about declarations
      if (
        ((t.isVariableDeclarator(path.parent) || t.isFunctionDeclaration(path.parent)) &&
          path.parent.id === path.node) ||
        ((t.isObjectProperty(path.parent) || t.isObjectMethod(path.parent)) &&
          path.parent.key === path.node)
      ) {
        return;
      }

      // We also don't care about something that has been accessed
      // off of a parent object (e.g. the `b` in `a.b`)
      if (
        t.isMemberExpression(path.parent) &&
        path.parent.property === path.node &&
        !path.parent.computed
      ) {
        return;
      }

      // We also don't care about class methods or properties
      if (
        ['MethodDefinition', 'ClassMethod'].some((type) => path.parent.type === type) &&
        path.parent.key === path.node
      ) {
        return;
      }

      // If a binding is found, but either isn't derived from the same
      // scope as our requires or isn't in our declarations map, we
      // can't do anything with it
      const binding = path.scope.getBinding(path.node.name);
      if (binding && binding.scope !== this.requireScope) {
        return;
      }

      // If we don't have it in our declarations map, then it must be
      // something else, skip
      if (!this.declarations.has(path.node.name)) {
        return;
      }

      path.replaceWith(t.memberExpression(this.importsVar, t.identifier(path.node.name)));

      // Don't process the value wee just inserted
      path.skip();
    },
  };

  const visitor = {
    Program(path) {
      const declarations = new Map();
      const importsVar = path.scope.generateUidIdentifier('imports');

      // Collect up the declarations
      path.traverse(requireDeclarationVisitor, { declarations });

      // Perform the replacements in the rest of the codebase
      path.traverse(requireUsagesVisitor, { declarations, requireScope: path.scope, importsVar });

      // Add the variables off to the side where we'll store our
      // resolved imports (for handling setters)
      const variableDeclarations = [];
      for (const [name, value] of declarations) {
        value.identifier = path.scope.generateUidIdentifier(name);
        variableDeclarations.push(
          t.variableDeclaration('const', [
            t.variableDeclarator(
              value.identifier,
              t.objectExpression([
                t.objectProperty(t.identifier('initialized'), t.booleanLiteral(false)),
              ])
            ),
          ])
        );
      }
      variableDeclarations.reverse();

      const properties = [];
      for (const [
        name,
        { identifier, requireString, isConst, outerFunc, propertyName },
      ] of declarations) {
        const nameIdentifier = t.identifier(name);
        const initializedIdentifier = t.identifier('initialized');
        const initializedMember = t.memberExpression(identifier, initializedIdentifier);
        const valueIdentifier = t.identifier('value');
        const valueMember = t.memberExpression(identifier, valueIdentifier);
        const requireExpression = t.callExpression(t.identifier('require'), [
          t.stringLiteral(requireString),
        ]);

        const requireExpressionWithOuterFunc = outerFunc
          ? t.callExpression(outerFunc, [requireExpression])
          : requireExpression;

        const requireExpressionWithOuterFuncAndProp = propertyName
          ? t.memberExpression(requireExpressionWithOuterFunc, t.identifier(propertyName))
          : requireExpressionWithOuterFunc;

        properties.push(
          t.objectMethod(
            'get',
            nameIdentifier,
            [],
            t.blockStatement([
              t.ifStatement(
                t.unaryExpression('!', initializedMember),
                t.blockStatement([
                  t.expressionStatement(
                    t.assignmentExpression('=', valueMember, requireExpressionWithOuterFuncAndProp)
                  ),
                  t.expressionStatement(
                    t.assignmentExpression('=', initializedMember, t.booleanLiteral(true))
                  ),
                ])
              ),
              t.returnStatement(valueMember),
            ])
          )
        );

        // Add a setter if this can be modified
        if (!isConst) {
          properties.push(
            t.objectMethod(
              'set',
              nameIdentifier,
              [valueIdentifier],
              t.blockStatement([
                // We do the require if setting before getting since it's
                // the only chance we'll have to initialize (in case there
                // is some code in the module that needed to run)
                t.ifStatement(
                  t.unaryExpression('!', initializedMember),
                  t.blockStatement([
                    t.expressionStatement(requireExpressionWithOuterFuncAndProp),
                    t.expressionStatement(
                      t.assignmentExpression('=', initializedMember, t.booleanLiteral(true))
                    ),
                  ])
                ),
                t.expressionStatement(t.assignmentExpression('=', valueMember, valueIdentifier)),
              ])
            )
          );
        }
      }

      path.unshiftContainer(
        'body',
        t.variableDeclaration('const', [
          t.variableDeclarator(importsVar, t.objectExpression(properties)),
        ])
      );
      for (const declaration of variableDeclarations) {
        path.unshiftContainer('body', declaration);
      }
    },
  };

  return { visitor };
};
