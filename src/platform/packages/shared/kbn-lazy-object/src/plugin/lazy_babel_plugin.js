/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @typedef {import('@babel/core').types} t
 * @typedef {import('@babel/core').PluginObj} PluginObj
 */

/**
 * Transforms calls to `lazyObject({...})` into a lazily-evaluated object.
 * Each property is rewritten to a memoized getter that evaluates the original
 * expression on first access, then replaces itself with a writable data
 * property holding the computed value. A setter is also defined to allow
 * overriding the memoized value.
 */
/**
 * @param {{ types: t }} babel
 * @returns {PluginObj}
 */
function lazyBabelPlugin({ types: t }) {
  /**
   * @param {any} node
   * @returns {boolean}
   */
  const isLazyObjectCallee = (node) => !!node && t.isIdentifier(node) && node.name === 'lazyObject';

  return {
    name: 'kbn-lazy-object-transform',
    visitor: {
      CallExpression: {
        enter(path) {
          const { node } = path;
          if (!isLazyObjectCallee(node.callee)) {
            return;
          }

          if (node.arguments.length !== 1) {
            return;
          }

          const arg = node.arguments[0];

          if (!t.isObjectExpression(arg)) {
            return;
          }

          /** @type {babel.NodePath<babel.types.Program>} */
          const program = path.findParent((p) => p.isProgram());

          if (!program) {
            return;
          }

          const body = program.node.body;

          let hasLazyObjectHelperImport = false;
          let hasCreateFromAnnotationsImport = false;
          let hasAnnotateImport = false;

          /** @type {babel.types.ImportDeclaration | undefined} **/
          const lazyObjectImportDeclaration = body.find((statement) => {
            return (
              t.isImportDeclaration(statement) && statement.source.value === '@kbn/lazy-object'
            );
          });

          if (!lazyObjectImportDeclaration) {
            return;
          }

          lazyObjectImportDeclaration.specifiers.forEach((specifier) => {
            if (!t.isImportSpecifier(specifier)) {
              return;
            }
          });

          body.forEach((statement) => {
            if (!t.isImportDeclaration(statement)) {
              return;
            }

            if (statement.source.value !== '@kbn/lazy-object') {
              return;
            }

            statement.specifiers.forEach((specifier) => {
              if (!t.isImportSpecifier(specifier)) {
                return;
              }

              if (specifier.imported.name === 'lazyObject') {
                hasLazyObjectHelperImport = true;
              } else if (specifier.imported.name === 'createLazyObjectFromAnnotations') {
                hasCreateFromAnnotationsImport = true;
              } else if (specifier.imported.name === 'annotateLazy') {
                hasAnnotateImport = true;
              }
            });
          });

          if (!hasLazyObjectHelperImport) {
            return;
          }

          if (!hasCreateFromAnnotationsImport) {
            lazyObjectImportDeclaration.specifiers.push(
              t.importSpecifier(
                t.identifier('createLazyObjectFromAnnotations'),
                t.identifier('createLazyObjectFromAnnotations')
              )
            );
          }

          if (!hasAnnotateImport) {
            lazyObjectImportDeclaration.specifiers.push(
              t.importSpecifier(t.identifier('annotateLazy'), t.identifier('annotateLazy'))
            );
          }

          // Build the argument object, annotating laziness on statically-known simple properties
          const newProps = [];

          for (const prop of arg.properties) {
            // Handle spreads by merging into target to preserve semantics
            if (t.isSpreadElement(prop)) {
              newProps.push(prop);
              continue;
            }

            // Object methods: define eagerly as function values
            if (t.isObjectMethod(prop)) {
              const key = prop.key;
              let propNameLiteral = null;
              if (t.isIdentifier(key)) {
                propNameLiteral = t.stringLiteral(key.name);
              } else if (t.isStringLiteral(key)) {
                propNameLiteral = key;
              }
              if (!propNameLiteral) continue;
              const fnExpr = t.functionExpression(
                null,
                prop.params,
                prop.body,
                prop.generator || false,
                prop.async || false
              );
              newProps.push(t.objectProperty(propNameLiteral, fnExpr));
              continue;
            }

            if (!t.isObjectProperty(prop)) continue;

            // Compute key name for simple keys; computed keys are defined eagerly
            let keyName = null;
            if (t.isIdentifier(prop.key)) keyName = prop.key.name;
            else if (t.isStringLiteral(prop.key)) keyName = prop.key.value;

            const valueExpr = prop.value;

            // If we can't lazify (computed key or unknown key), define eagerly and continue
            if (!keyName || prop.computed) {
              let nameNode;
              if (t.isIdentifier(prop.key)) {
                nameNode = t.identifier(prop.key.name);
              } else if (t.isStringLiteral(prop.key)) {
                nameNode = t.stringLiteral(prop.key.value);
              } else {
                nameNode = prop.key;
              }
              newProps.push(t.objectProperty(nameNode, valueExpr, Boolean(prop.computed), false));
              continue;
            }

            // Lazify normal properties with simple keys by wrapping value in annotateLazy(() => value)
            const keyNode = t.stringLiteral(keyName);
            const factory = t.arrowFunctionExpression([], valueExpr);
            const annotated = t.callExpression(t.identifier('annotateLazy'), [factory]);
            newProps.push(t.objectProperty(keyNode, annotated));
          }

          // Replace with createLazyObjectFromAnnotations({...annotated...}) call
          const replacement = t.callExpression(t.identifier('createLazyObjectFromAnnotations'), [
            t.objectExpression(newProps),
          ]);

          path.replaceWith(replacement);
        },
      },
    },
  };
}

module.exports = lazyBabelPlugin;
