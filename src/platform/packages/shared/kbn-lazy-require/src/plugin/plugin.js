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

const HELPER_ID = '__lazyRequire';
const HELPER_IMPORT_SOURCE = '@kbn/lazy-require';
// Reusable keep directive regex
const KEEP_RE = /(?:@kbn\/lazy-require|kbn[- ]?lazy[- ]?require|lazy[- ]?require)\s*:??\s*keep/i;

/**
 * @fileoverview Babel plugin to lazify top-level CommonJS requires (post ESM → CJS).
 *
 * It replaces:
 *   const foo = require('mod');
 * with:
 *   const { __lazyRequire } = require('<helperModule>');
 *   const __foo = __lazyRequire(() => require('mod'));
 *   // and rewrites all reads of `foo` → `__foo.value`
 *
 * For destructuring:
 *   const { a, b: c } = require('mod');
 * becomes:
 *   const __mod = __lazyRequire(() => require('mod'));
 *   // and later reads:
 *   a   → __mod.value.a
 *   c   → __mod.value.b
 *
 * Interop wrappers are preserved:
 *   const _foo = _interopRequireDefault(require('foo'));
 * becomes:
 *   const __foo = __lazyRequire(() => _interopRequireDefault(require('foo')));
 *   // later: _foo.default → __foo.value.default
 *
 * Pure side-effect requires (bare `require('x')` as an expression statement) are left untouched.
 *
 * Limitations (by design, to keep the transform predictable):
 * - Only transforms top-level variable declarations (Program body).
 * - Skips non-string or dynamic requires.
 * - Skips destructuring with rest elements or computed keys.
 * - Skips bindings that are reassigned later (i.e., non-constant).
 * - Does not alter bare inline uses like `require('x').install()` (they’re not declarations).
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
  options.specifiers.exclude = (options.specifiers.exclude ?? []).concat('@kbn/lazy-requires');

  options.debug.include.push(
    ...(process.env.KBN_DEBUG_LAZY_REQUIRES
      ? process.env.KBN_DEBUG_LAZY_REQUIRES.split(',').map((item) => item.trim())
      : [])
  );

  const debugMatcher = createMatch(options.debug?.include, [], false);

  const filesMatcher = createMatch(options.files?.include, options.files?.exclude);
  const specifierMatcher = createMatch(options.specifiers?.include, options.specifiers?.exclude);

  /** @type {(n: import('@babel/types').Node) => boolean} */
  function isTopLevel(path) {
    return !!path.findParent((p) => p.isProgram());
  }

  /**
   * Returns true if node is a bare `require('x')` call (callee: Identifier 'require', one string literal arg).
   * @param {import('@babel/types').Node} node
   * @returns {{ok: true, arg: import('@babel/types').StringLiteral} | {ok: false}}
   */
  function isBareRequireCall(node) {
    if (!t.isCallExpression(node)) return { ok: false };
    const { callee, arguments: args } = node;
    if (!t.isIdentifier(callee, { name: 'require' })) return { ok: false };
    if (args.length !== 1 || !t.isStringLiteral(args[0])) return { ok: false };
    return { ok: true, arg: /** @type {import('@babel/types').StringLiteral} */ (args[0]) };
    // NOTE: we intentionally exclude require.resolve and dynamic requires.
  }

  /**
   * Determines whether an initializer expression is "require-ish" in the sense that it’s
   * a direct require or a require wrapped in common interop helpers or followed by a property read.
   *
   * Examples that return true (wrapping preserved as-is):
   *   require('x')
   *   _interopRequireDefault(require('x'))
   *   _interopRequireWildcard(require('x'), true)
   *   require('x').default
   *   _interopRequireDefault(require('x')).default
   *
   * Returns a clone of the *entire* init expression to be used inside the lazy factory.
   *
   * @param {import('@babel/types').Expression} initExpr
   * @returns {{ ok: true, factoryInner: import('@babel/types').Expression, moduleName: string } | { ok: false }}
   */
  function analyzeRequireInitializer(initExpr) {
    // Walk down through one level of member access to find an underlying require/wrapper.
    /** @type {import('@babel/types').Expression} */
    const cursor = initExpr;

    // Helper: peel trivial .default or property reads, but remember we’ll preserve `initExpr` as-is.
    const dig = (expr) => {
      if (t.isMemberExpression(expr) && t.isExpression(expr.object)) {
        return expr.object;
      }
      return expr;
    };

    const first = dig(cursor);

    // 1) Bare require('x')
    let bare = isBareRequireCall(first);
    if (bare.ok) {
      return {
        ok: true,
        factoryInner: t.cloneNode(initExpr, /* deep */ true),
        moduleName: bare.arg.value,
      };
    }

    // 2) A call whose first argument is require('x') (interop wrapper)
    if (t.isCallExpression(first)) {
      const args = first.arguments;
      if (args.length >= 1) {
        const a0 = args[0];
        if (t.isExpression(a0)) {
          bare = isBareRequireCall(a0);
          if (bare.ok) {
            return {
              ok: true,
              factoryInner: t.cloneNode(initExpr, true),
              moduleName: bare.arg.value,
            };
          }
        }
      }
    }

    // Not recognized
    return { ok: false };
  }

  /**
   * Replace an identifier reference path with a (possibly) complex expression.
   * Handles object shorthand `{x}` → `{x: <expr>}` automatically.
   * @param {import('@babel/core').NodePath<import('@babel/types').Identifier>} refPath
   * @param {import('@babel/types').Expression} replacement
   */
  function replaceRef(refPath, replacement) {
    const parent = refPath.parentPath;

    // Expand object-property shorthand: { x } -> { x: replacement }
    if (
      parent &&
      parent.isObjectProperty() &&
      parent.node.shorthand &&
      parent.node.key === refPath.node
    ) {
      parent.replaceWith(
        t.objectProperty(refPath.node, replacement, /* computed */ false, /* shorthand */ false)
      );
      return;
    }

    // General case
    refPath.replaceWith(replacement);
  }

  /**
   * Builds `__box.value` or `__box.value.prop` expression.
   * @param {import('@babel/types').Identifier} boxId
   * @param {string | null} propName
   * @returns {import('@babel/types').MemberExpression | import('@babel/types').Identifier}
   */
  function buildBoxRead(boxId, propName) {
    // Clone the identifier by name to avoid reusing the same node instance in multiple places
    const baseId = t.identifier(boxId.name);
    const valueAccess = t.memberExpression(baseId, t.identifier('value'));
    if (!propName) return valueAccess;
    return t.memberExpression(valueAccess, t.identifier(propName));
  }

  /**
   * Detect a comment directive telling the transformer to keep this require as-is.
   * Works when added to the ESM import (carried over to the compiled CJS declaration) or directly
   * on the generated require variable declaration.
   *
   * Examples:
   *   import x from 'mod'; // lazy-require keep
   *   // lazy-require: keep
   *   const x = require('mod');
   *
   * @param {import('@babel/core').NodePath} p
   */
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

  /**
   * @param {import('@babel/core').NodePath<import('@babel/types').VariableDeclarator>} declaratorPath
   * @returns {boolean} whether transformed
   */
  function transformDeclarator(declaratorPath) {
    const node = declaratorPath.node;
    if (!isTopLevel(declaratorPath)) return false;
    if (!node.init || !t.isExpression(node.init)) return false;

    // Author opted out via comment (supports comments on ESM import carried to CJS, or on the var decl)
    if (hasNearbyKeepDirective(declaratorPath)) {
      return false;
    }

    // Skip patterns that we explicitly leave alone
    // - require.resolve
    if (
      t.isCallExpression(node.init) &&
      t.isMemberExpression(node.init.callee) &&
      t.isIdentifier(node.init.callee.object, { name: 'require' }) &&
      t.isIdentifier(node.init.callee.property, { name: 'resolve' })
    ) {
      return false;
    }

    const analyzed = analyzeRequireInitializer(node.init);
    if (!analyzed.ok) return false;

    // Never rewrite the helper import itself
    if (analyzed.moduleName === HELPER_IMPORT_SOURCE) return false;

    // Respect per-file keep markers collected from ESM ImportDeclarations
    if (stateKeepModules && stateKeepModules.has(analyzed.moduleName)) return false;

    if (!specifierMatcher(analyzed.moduleName)) return false;

    // Handle both Identifier and ObjectPattern with shared logic
    /** @type {import('@babel/types').Identifier | null} */
    let boxId = null;
    /** @type {Array<{ local: string; prop: string | null }>} */
    let mappings = [];

    if (t.isIdentifier(node.id)) {
      const origName = node.id.name;
      const binding = declaratorPath.scope.getBinding(origName);
      if (!binding || !binding.constant) return false;
      boxId = node.id;
      mappings = [{ local: origName, prop: null }];
    } else if (t.isObjectPattern(node.id)) {
      const pattern = node.id;
      // Reject complex patterns: rest elements or computed keys.
      for (const p of pattern.properties) {
        if (t.isRestElement(p)) return false;
        if (t.isObjectProperty(p) && p.computed) return false;
        if (!t.isObjectProperty(p)) return false;
        if (!t.isIdentifier(p.value)) return false; // skip nested patterns and default values
      }
      /** @type {Array<{local: string, remote: string}>} */
      const pairs = pattern.properties.map((p) => {
        const op = /** @type {import('@babel/types').ObjectProperty} */ (p);
        const remote = t.isIdentifier(op.key)
          ? op.key.name
          : /** @type {import('@babel/types').StringLiteral} */ (op.key).value;
        const local = /** @type {import('@babel/types').Identifier} */ (op.value).name;
        return { local, remote };
      });
      // All locals must be constant (no reassignments)
      for (const { local } of pairs) {
        const b = declaratorPath.scope.getBinding(local);
        if (!b || !b.constant) return false;
      }
      // Create one shared box for the module
      const moduleBase = analyzed.moduleName.replace(/[^a-zA-Z0-9_$]+/g, '_') || 'mod';
      boxId = declaratorPath.scope.generateUidIdentifier(`__${moduleBase}`);
      mappings = pairs.map(({ local, remote }) => ({ local, prop: remote }));
    } else {
      // Other patterns are ignored
      return false;
    }

    // Rewrite references according to mappings
    for (const { local, prop } of mappings) {
      const b = declaratorPath.scope.getBinding(local);
      if (!b) continue;
      for (const refPath of b.referencePaths) {
        replaceRef(refPath, buildBoxRead(boxId, prop));
      }
    }

    // Emit the lazy initializer and replace the declarator with a single box binding
    const lazyInit = t.callExpression(t.identifier(HELPER_ID), [
      t.arrowFunctionExpression([], t.cloneNode(analyzed.factoryInner, true)),
    ]);
    const newDecl = t.variableDeclarator(boxId, lazyInit);
    t.inheritsComments(newDecl, node);
    declaratorPath.replaceWith(newDecl);
    return true;

    // Other patterns are ignored.
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
            debug(() => 'Skipping transform as plugin is not enabled');
            return;
          }

          if (!filesMatcher(filename)) {
            debug(() => 'Skipping transform as it is ignored');
            return;
          }

          debug(() => {
            const generate = require('@babel/generator').default;
            const { code } = generate(programPath.hub.file.ast, {
              compact: false,
              comments: true,
              retainLines: false,
            });
            const header =
              `--- KBN_DEBUG_LAZY_REQUIRES [${filename || '<unknown>'}]` + ` START INPUT ---`;

            // eslint-disable-next-line no-console
            return `${header}\n${code}\n--- KBN_DEBUG_LAZY_REQUIRES END INPUT ---`;
          });

          // Track simple identifier declarators we transformed, to ensure we catch any missed refs later.
          /** @type {Set<string>} */
          const simpleTransformed = new Set();
          const helperName = HELPER_ID;

          // Fast bail if there are no top-level variable declarations.
          const varDecls = programPath.get('body').filter((p) => p.isVariableDeclaration());
          if (varDecls.length === 0) return;

          // Transform each declarator independently.
          let didAnyTransform = false;
          for (const vd of varDecls) {
            /** @type {import('@babel/core').NodePath<import('@babel/types').VariableDeclaration>} */
            const vDeclPath = vd;
            // Compute ignore matcher once per Program
            for (const declaratorPath of vDeclPath.get('declarations')) {
              const did = transformDeclarator(declaratorPath);
              // Record simple identifier names we transformed so we can do a safety second pass.
              if (did) {
                didAnyTransform = true;
                const n = declaratorPath.node;
                if (n && t.isVariableDeclarator(n) && t.isIdentifier(n.id)) {
                  simpleTransformed.add(n.id.name);
                }
              }
            }
          }

          // If any transform happened, ensure we have a single helper import declared once per file.
          if (didAnyTransform && !programPath.scope.hasBinding(HELPER_ID)) {
            const helperDecl = t.variableDeclaration('const', [
              t.variableDeclarator(
                t.objectPattern([
                  // { __lazyRequire }
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

            // Insert after any directive prologue (e.g., 'use strict'). If no directives, insert at top of body.
            const directives = programPath.get('directives');
            if (Array.isArray(directives) && directives.length > 0) {
              directives[directives.length - 1].insertAfter(helperDecl);
            } else {
              programPath.unshiftContainer('body', helperDecl);
            }
          }

          // Safety second pass: replace any remaining bare references of transformed simple identifiers
          // with `<id>.value`. This covers any references missed due to binding quirks.
          if (simpleTransformed.size > 0) {
            programPath.traverse({
              Identifier(idPath) {
                if (!idPath.isReferencedIdentifier()) return;
                const name = idPath.node.name;
                if (!simpleTransformed.has(name)) return;
                // Avoid replacing already-correct `.value` member accesses
                const parent = idPath.parentPath;
                if (
                  parent &&
                  parent.isMemberExpression() &&
                  parent.node.object === idPath.node &&
                  t.isIdentifier(parent.node.property, { name: 'value' }) &&
                  !parent.node.computed
                ) {
                  return;
                }
                replaceRef(idPath, buildBoxRead(t.identifier(name), null));
              },
            });
          }

          // Build a mapping of lazy box identifier -> moduleName by scanning top-level declarations
          /** @type {Map<string, string>} */
          const boxModuleMap = new Map();
          const isHelperCall = (expr) =>
            t.isCallExpression(expr) && t.isIdentifier(expr.callee, { name: helperName });
          for (const stmt of programPath.get('body')) {
            if (!stmt.isVariableDeclaration()) continue;
            for (const d of stmt.get('declarations')) {
              const id = d.node.id;
              const init = d.node.init;
              if (!t.isIdentifier(id) || !init || !isHelperCall(init)) continue;
              const firstArg = init.arguments[0];
              if (!t.isArrowFunctionExpression(firstArg) && !t.isFunctionExpression(firstArg)) {
                continue;
              }
              const bodyExpr = t.isBlockStatement(firstArg.body)
                ? null
                : /** @type {import('@babel/types').Expression} */ (firstArg.body);
              if (!bodyExpr) continue;
              const analyzedFactory = analyzeRequireInitializer(bodyExpr);
              if (analyzedFactory.ok) {
                boxModuleMap.set(id.name, analyzedFactory.moduleName);
              }
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
            const header = `--- KBN_DEBUG_LAZY_REQUIRES [${filename || '<unknown>'}] START ---`;

            // eslint-disable-next-line no-console
            return `${header}\n${code}\n--- KBN_DEBUG_LAZY_REQUIRES END ---`;
          });
          // Reset per-file keep set
          stateKeepModules = undefined;
        },
      },
    },
  };
};
