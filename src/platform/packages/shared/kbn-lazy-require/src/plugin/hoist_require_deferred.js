/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Creates a visitor that finds `requireDeferred` imports from `@kbn/lazy-require`,
 * hoists a single `requireDeferred()` call to the top of the module, and removes
 * all other `requireDeferred()` calls.
 *
 * This is designed to be run in `Program.enter` to handle both ESM imports and
 * top-level `requireDeferred()` calls before other transforms run.
 *
 * @param {babel.types} t
 * @param {babel.NodePath<babel.ProgramPath>} programPath
 */
exports.hoistRequireDeferredExpression = (t, programPath) => {
  const REQUIRE_DEFERRED_ID = 'requireDeferred';
  const LAZY_REQUIRE_SOURCE = '@kbn/lazy-require';

  let requireDeferredBindingName;
  let lazyRequireImportPath;

  // First, find the import of `requireDeferred` from `@kbn/lazy-require`.
  programPath.traverse({
    ImportDeclaration(path) {
      if (path.node.source.value !== LAZY_REQUIRE_SOURCE) {
        return;
      }

      for (const specifier of path.get('specifiers')) {
        if (
          specifier.isImportSpecifier() &&
          t.isIdentifier(specifier.node.imported, { name: REQUIRE_DEFERRED_ID })
        ) {
          const importDeclarationNode = path.node;

          importDeclarationNode.source = t.stringLiteral(
            `@kbn/lazy-require/src/require_deferred_auto`
          );
          importDeclarationNode.specifiers = [];

          path.remove();
          const [newPath] = programPath.unshiftContainer('body', importDeclarationNode);

          requireDeferredBindingName = specifier.node.local.name;
          lazyRequireImportPath = newPath;

          path.stop(); // Stop traversal once we've found it.
          break;
        }
      }
    },
  });

  if (!requireDeferredBindingName || !lazyRequireImportPath) {
    return;
  }

  // Now, find and remove all other top-level requireDeferred() calls.
  const callsToRemove = [];
  programPath.traverse({
    CallExpression(path) {
      if (
        !path.get('callee').isIdentifier({ name: requireDeferredBindingName }) ||
        !path.parentPath.isExpressionStatement() ||
        !path.parentPath.parentPath.isProgram()
      ) {
        return;
      }
      callsToRemove.push(path.parentPath);
    },
  });

  for (const callPath of callsToRemove) {
    callPath.remove();
  }
};
