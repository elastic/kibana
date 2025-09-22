/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { castArray, merge } = require('lodash');
const createMatch = require('./match');
const path = require('path');
const { hoistRequireDeferredExpression } = require('./hoist_require_deferred');

const HELPER_ID = '__lazyRequire';
const HELPER_IMPORT_SOURCE = '@kbn/lazy-require';
// Reusable keep directive regex
const KEEP_RE = /(?:@kbn\/lazy-require|kbn[- ]?lazy[- ]?require|lazy[- ]?require)\s*:??\s*keep/i;

/**
 * Babel plugin to lazify top-level CommonJS requires.
 *
 *
 *
 * @typedef {import('./types').Pattern} Pattern
 *
 * @param {import('@babel/core')} babel
 * @param {import('./types').LazyRequirePluginOptions} initialOptions
 * @returns {import('@babel/core').PluginObj<import('./types').LazyRequirePluginOptions>}
 */
module.exports = function lazyRequirePlugin(babel, initialOptions) {
  const t = babel.types;
  /** @type {Set<string> | undefined} */
  let stateKeepModules;

  const options = merge(
    {
      enabled: !process.env.KBN_DISABLE_LAZY_REQUIRES,
      debug: {
        include: [],
      },
      files: {
        include: [],
        exclude: [],
      },
      specifiers: {
        include: [],
        exclude: [],
      },
    },
    initialOptions
  );

  options.files.exclude = (options.files.exclude ?? []).concat(path.resolve(__dirname, '../..'));
  options.specifiers.exclude = (options.specifiers.exclude ?? []).concat(
    '@kbn/lazy-require',
    '@babel'
  );

  options.debug.include.push(
    ...(process.env.KBN_DEBUG_LAZY_REQUIRES
      ? process.env.KBN_DEBUG_LAZY_REQUIRES.split(',').map((item) => item.trim())
      : [])
  );

  const debugMatcher = createMatch(options.debug?.include, [], false);

  const filesMatcher = createMatch(options.files?.include, options.files?.exclude);
  const specifierMatcher = createMatch(options.specifiers?.include, options.specifiers?.exclude);

  function hasKeepComment(p) {
    const check = (node) => {
      if (!node) return false;
      /** @type {Array<import('@babel/types').Comment>} */
      const comments = [
        ...(node.leadingComments || []),
        ...(node.innerComments || []),
        ...(node.trailingComments || []),
      ];
      return comments.some((c) => typeof c.value === 'string' && KEEP_RE.test(c.value));
    };
    if (!p) return false;
    if (check(p.node)) return true;
    const parent = p.parentPath && p.parentPath.node;
    return check(parent);
  }

  /**
   * Broader check: look for a keep directive on the nearest statement, or as a trailing comment on the
   * previous sibling statement. This helps when comment attachment shifts during ESM→CJS transforms.
   * @param {import('@babel/core').NodePath} p
   */
  function hasNearbyKeepDirective(p) {
    if (!p) return false;
    if (hasKeepComment(p)) return true;
    const stmt = p.findParent((q) => q.isStatement && q.isStatement());
    if (stmt && hasKeepComment(stmt)) return true;
    if (stmt && stmt.getPrevSibling) {
      const prev = stmt.getPrevSibling();
      if (prev && prev.node && Array.isArray(prev.node.trailingComments)) {
        if (
          prev.node.trailingComments.some(
            (c) => typeof c.value === 'string' && KEEP_RE.test(c.value)
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  return {
    name: 'babel-plugin-lazy-require',
    inherits: undefined,

    /**
     * @param {PluginOptions} [pluginOptions]
     */
    visitor: {
      Program: {
        enter(programPath) {
          // Collect module sources from ESM imports that have a keep directive comment
          stateKeepModules = new Set();
          const check = (node) => {
            const comments = [
              ...(node.leadingComments || []),
              ...(node.innerComments || []),
              ...(node.trailingComments || []),
            ];
            return comments.some((c) => typeof c.value === 'string' && KEEP_RE.test(c.value));
          };
          for (const child of programPath.get('body')) {
            if (!child.isImportDeclaration()) continue;
            if (check(child.node)) {
              const src = child.node.source && child.node.source.value;
              if (typeof src === 'string' && src) {
                stateKeepModules.add(src);
              }
            }
          }

          hoistRequireDeferredExpression(t, programPath);
        },
        exit(programPath, state) {
          const filename = state && state.file && state.file.opts && state.file.opts.filename;

          /**
           * @type {( fn:( ) => string | string[] ) => void}
           */
          let debug;
          if (debugMatcher(filename)) {
            debug = (fn) => console.log(`[${filename}]`, ...castArray(fn()));
          } else {
            debug = () => undefined;
          }

          if (options.enabled === false) {
            debug(() => 'Skipping transform as plugin is not enabled');
            return;
          }

          if (!filesMatcher(filename)) {
            // debug(() => 'Skipping transform as it is ignored');
            return;
          }

          debug(() => 'Processing');

          debug(() => {
            // eslint-disable-next-line import/no-extraneous-dependencies
            const generate = require('@babel/generator').default;
            const { code } = generate(programPath.hub.file.ast, {
              compact: false,
              comments: true,
              retainLines: false,
            });
            const header = `--- START INPUT ---`;
            // eslint-disable-next-line no-console
            return `\n${header}\n${code}\n--- END INPUT ---`;
          });

          // Helpers
          /** @param {import('@babel/core').NodePath<import('@babel/types').Identifier>} refPath */
          function replaceRef(refPath, replacement) {
            const parent = refPath.parentPath;
            if (
              parent &&
              parent.isObjectProperty() &&
              parent.node.shorthand &&
              parent.node.key === refPath.node
            ) {
              parent.replaceWith(t.objectProperty(refPath.node, replacement, false, false));
              return;
            }
            refPath.replaceWith(replacement);
          }

          /** @param {string} name */
          function buildBoxRead(name) {
            return t.memberExpression(t.identifier(name), t.identifier('value'));
          }

          /** @param {import('@babel/types').Expression} expr */
          function getRequiredModuleFromInit(expr) {
            if (t.isCallExpression(expr)) {
              if (t.isIdentifier(expr.callee, { name: 'require' })) {
                const arg0 = expr.arguments[0];
                if (t.isStringLiteral(arg0)) return arg0.value;
                return null;
              }
              // Look for require('x') in args (interop wrappers)
              for (const a of expr.arguments) {
                if (t.isCallExpression(a) && t.isIdentifier(a.callee, { name: 'require' })) {
                  const arg0 = a.arguments[0];
                  if (t.isStringLiteral(arg0)) return arg0.value;
                }
              }
            }
            return null;
          }

          /** @param {import('@babel/types').CallExpression} expr */
          function isAllowedOuterCallee(expr) {
            return (
              t.isIdentifier(expr.callee, { name: 'require' }) ||
              t.isIdentifier(expr.callee, { name: '_interopRequireWildcard' }) ||
              t.isIdentifier(expr.callee, { name: '_interopRequireDefault' })
            );
          }

          /** Ensure `__lazyRequire` is imported once (ESM or CJS based on file). */
          function ensureHelperImport() {
            // If binding already exists, do nothing
            if (programPath.scope.hasBinding(HELPER_ID)) return;
            const directives = programPath.get('directives');
            // Check existing import declarations
            // CJS style require destructuring
            const helperDecl = t.variableDeclaration('const', [
              t.variableDeclarator(
                t.objectPattern([
                  t.objectProperty(
                    t.identifier(HELPER_ID),
                    t.identifier(HELPER_ID),
                    /* computed */ false,
                    /* shorthand */ true
                  ),
                ]),
                t.callExpression(t.identifier('require'), [t.stringLiteral(HELPER_IMPORT_SOURCE)])
              ),
            ]);

            if (Array.isArray(directives) && directives.length > 0) {
              directives[directives.length - 1].insertAfter(helperDecl);
            } else {
              programPath.unshiftContainer('body', helperDecl);
            }
          }

          // Begin transform: scan top-level variable declarations
          /** @type {Set<string>} */
          const transformed = new Set();

          for (const stmt of programPath.get('body')) {
            if (!stmt.isVariableDeclaration()) {
              continue;
            }

            /** @type {babel.NodePath<babel.types.VariableDeclaration>} */
            const varStatement = stmt;

            for (const declaration of varStatement.get('declarations')) {
              const id = declaration.node.id;
              const init = declaration.node.init;
              if (!t.isIdentifier(id) || !init || !t.isCallExpression(init)) continue;

              // Respect keep directive on this declaration
              if (hasNearbyKeepDirective(declaration)) continue;

              // Only process allowed outer callees
              if (!isAllowedOuterCallee(init)) continue;

              const moduleName = getRequiredModuleFromInit(init);

              if (!moduleName) continue;

              // Exclusions and inclusions
              if (!specifierMatcher(moduleName)) continue;
              if (stateKeepModules && stateKeepModules.has(moduleName)) continue;
              if (moduleName === HELPER_IMPORT_SOURCE) continue; // don't transform the helper itself

              // Replace initializer with __lazyRequire(() => require(moduleName))
              const lazyInit = t.callExpression(t.identifier(HELPER_ID), [
                t.arrowFunctionExpression([], init),
              ]);

              declaration.get('init').replaceWith(lazyInit);

              transformed.add(id.name);
            }
          }

          // Scope-aware pass: replace references to transformed top-level bindings
          // with `<name>.value`. We only rewrite Identifier references that resolve
          // to the original top-level binding to avoid shadowing issues (for
          // example when a function argument or inner variable uses the same name).
          if (transformed.size > 0) {
            ensureHelperImport();
            // Build a map of the original top-level binding objects for quick
            // identity checks during traversal.
            const topLevelBindings = Object.create(null);
            for (const name of transformed) {
              const binding = programPath.scope.getBinding(name);
              if (
                binding &&
                binding.scope &&
                binding.scope.block &&
                binding.scope.block.type === 'Program'
              ) {
                topLevelBindings[name] = binding;
              }
            }

            if (Object.keys(topLevelBindings).length > 0) {
              programPath.traverse({
                Identifier(path) {
                  // Only consider referenced identifiers (skip declarations, keys, etc.)
                  if (!path.isReferencedIdentifier() || path.node == null) return;

                  const name = path.node.name;

                  if (!topLevelBindings[name]) return;

                  // Resolve the binding for this occurrence; if it's not the same
                  // as the original top-level binding we transformed, it's a
                  // shadowed/local binding and should not be rewritten.
                  const occurrenceBinding = path.scope.getBinding(name);
                  if (occurrenceBinding !== topLevelBindings[name]) return;

                  // If this identifier is already used as the object of a
                  // `.value` access (e.g. `_eui.value`) then skip replacing to
                  // avoid producing `_eui.value.value`.

                  // Perform the replacement. replaceRef handles object property
                  // shorthand correctly.
                  path.skip();
                  replaceRef(path, buildBoxRead(name));
                },
              });
            }
          }

          debug(() => {
            // eslint-disable-next-line import/no-extraneous-dependencies
            const generate = require('@babel/generator').default;
            const { code } = generate(programPath.hub.file.ast, {
              compact: false,
              comments: true,
              retainLines: false,
            });
            const header = `\n--- START ---`;
            // eslint-disable-next-line no-console
            return `${header}\n${code}\n--- END ---`;
          });

          // Reset per-file keep set
          stateKeepModules = undefined;
        },
      },
    },
  };
};
