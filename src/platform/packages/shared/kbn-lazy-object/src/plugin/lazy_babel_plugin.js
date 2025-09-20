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
function lazyBabelPlugin({ types: bt }) {
  /**
   * @param {any} node
   * @returns {boolean}
   */
  const isLazyObjectCallee = (node) =>
    !!node && bt.isIdentifier(node) && node.name === 'lazyObject';

  return {
    name: 'kbn-lazy-object-transform',
    visitor: {
      CallExpression(path) {
        const { node } = path;
        if (!isLazyObjectCallee(node.callee)) return;
        if (node.arguments.length !== 1) return;
        const arg = node.arguments[0];
        if (!bt.isObjectExpression(arg)) return;

        // Build the argument object, annotating laziness on statically-known simple properties
        const newProps = [];

        for (const prop of arg.properties) {
          // Handle spreads by merging into target to preserve semantics
          if (bt.isSpreadElement(prop)) {
            newProps.push(prop);
            continue;
          }

          // Object methods: define eagerly as function values
          if (bt.isObjectMethod(prop)) {
            const key = prop.key;
            let propNameLiteral = null;
            if (bt.isIdentifier(key)) {
              propNameLiteral = bt.stringLiteral(key.name);
            } else if (bt.isStringLiteral(key)) {
              propNameLiteral = key;
            }
            if (!propNameLiteral) continue;
            const fnExpr = bt.functionExpression(
              null,
              prop.params,
              prop.body,
              prop.generator || false,
              prop.async || false
            );
            newProps.push(bt.objectProperty(propNameLiteral, fnExpr));
            continue;
          }

          if (!bt.isObjectProperty(prop)) continue;

          // Compute key name for simple keys; computed keys are defined eagerly
          let keyName = null;
          if (bt.isIdentifier(prop.key)) keyName = prop.key.name;
          else if (bt.isStringLiteral(prop.key)) keyName = prop.key.value;

          const valueExpr = prop.value;

          // If we can't lazify (computed key or unknown key), define eagerly and continue
          if (!keyName || prop.computed) {
            let nameNode;
            if (bt.isIdentifier(prop.key)) {
              nameNode = bt.identifier(prop.key.name);
            } else if (bt.isStringLiteral(prop.key)) {
              nameNode = bt.stringLiteral(prop.key.value);
            } else {
              nameNode = prop.key;
            }
            newProps.push(bt.objectProperty(nameNode, valueExpr, Boolean(prop.computed), false));
            continue;
          }

          // Lazify normal properties with simple keys by wrapping value in annotateLazy(() => value)
          const keyNode = bt.stringLiteral(keyName);
          const factory = bt.arrowFunctionExpression([], valueExpr);
          const annotated = bt.callExpression(bt.identifier('annotateLazy'), [factory]);
          newProps.push(bt.objectProperty(keyNode, annotated));
        }

        // Replace with createLazyObjectFromAnnotations({...annotated...}) call
        const replacement = bt.callExpression(bt.identifier('createLazyObjectFromAnnotations'), [
          bt.objectExpression(newProps),
        ]);

        // Insert import if not present: import { createLazyObjectFromAnnotations, annotateLazy } from '@kbn/lazy-object'
        const program = path.findParent((p) => p.isProgram());
        if (program) {
          const hasCreateImport = program.node.body.some(
            (n) =>
              bt.isImportDeclaration(n) &&
              n.source.value === '@kbn/lazy-object' &&
              n.specifiers.some(
                (s) =>
                  bt.isImportSpecifier(s) && s.imported.name === 'createLazyObjectFromAnnotations'
              )
          );
          const hasAnnotateImport = program.node.body.some(
            (n) =>
              bt.isImportDeclaration(n) &&
              n.source.value === '@kbn/lazy-object' &&
              n.specifiers.some(
                (s) => bt.isImportSpecifier(s) && s.imported.name === 'annotateLazy'
              )
          );
          if (!hasCreateImport || !hasAnnotateImport) {
            // If there's already an import from @kbn/lazy-object, extend it; otherwise add a new one
            const existing = program.node.body.find(
              (n) => bt.isImportDeclaration(n) && n.source.value === '@kbn/lazy-object'
            );
            if (existing && bt.isImportDeclaration(existing)) {
              const existingNames = new Set(
                existing.specifiers
                  .filter((s) => bt.isImportSpecifier(s))
                  .map((s) => s.imported.name)
              );
              if (!existingNames.has('createLazyObjectFromAnnotations')) {
                existing.specifiers.push(
                  bt.importSpecifier(
                    bt.identifier('createLazyObjectFromAnnotations'),
                    bt.identifier('createLazyObjectFromAnnotations')
                  )
                );
              }
              if (!existingNames.has('annotateLazy')) {
                existing.specifiers.push(
                  bt.importSpecifier(bt.identifier('annotateLazy'), bt.identifier('annotateLazy'))
                );
              }
            } else {
              const importDecl = bt.importDeclaration(
                [
                  bt.importSpecifier(
                    bt.identifier('createLazyObjectFromAnnotations'),
                    bt.identifier('createLazyObjectFromAnnotations')
                  ),
                  bt.importSpecifier(bt.identifier('annotateLazy'), bt.identifier('annotateLazy')),
                ],
                bt.stringLiteral('@kbn/lazy-object')
              );
              program.node.body.unshift(importDecl);
            }
          }
        }

        path.replaceWith(replacement);
      },
    },
  };
}

module.exports = lazyBabelPlugin;
