/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
 * @typedef {Object} PluginOptions
 * @property {boolean} [inlineHelper=true] Inline the helper function into the transformed file (preferred for runtime transforms).
 * @property {string} [helperModule="./lazy_require_helper"] Path passed to `require()` that provides `__lazyRequire` when inlineHelper=false.
 * @property {string} [helperName="__lazyRequire"]  The identifier exported by the helper module or inline helper.
 * @property {(string|RegExp)[]} [ignoreSpecifiers] List of module specifiers to skip lazifying. Strings may include '*' wildcards.
 * @property {boolean} [disableStyledComponentsDynamicCreationWarning=true] When true, wrap styled-components tagged template calls so they execute with NODE_ENV='production' to avoid dynamic-creation warnings (and hook tracking) during render.
 *
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj<PluginOptions>}
 */
module.exports = function lazyRequirePlugin(babel) {
  const t = babel.types;

  /**
   * Check if we should print the transformed output for this file based on KBN_DEBUG_DEFER_REQUIRES.
   * The env var accepts a delimited list ("," or path delimiter like ":") of substrings; if any
   * substring matches the absolute filename, the plugin will print the transformed code to stdout.
   * A lone "*" matches all files.
   * @param {string|undefined} filename
   */
  function shouldDebug(filename) {
    if (!filename) return false;
    const raw = process.env.KBN_DEBUG_DEFER_REQUIRES;
    if (!raw) return false;
    const parts = raw
      .split(/[,:;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return false;
    if (parts.includes('*')) return true;
    return parts.some((p) => filename.includes(p));
  }

  /**
   * Build matchers for specifiers to ignore, from plugin options and/or env var KBN_DEFER_REQUIRES_IGNORE.
   * - Options: state.opts.ignoreSpecifiers: (string|RegExp)[]
   * - Env:     KBN_DEFER_REQUIRES_IGNORE=spec1,spec2;supports '*' wildcards
   * Returns a function (name: string) => boolean
   */
  function buildIgnoreMatcher(state) {
    /** @type {Array<string|RegExp>} */
    const fromOpts = Array.isArray(state?.opts?.ignoreSpecifiers)
      ? state.opts.ignoreSpecifiers
      : [];
    /** @type {string[]} */
    const fromEnv = (process.env.KBN_DEFER_REQUIRES_IGNORE || '')
      .split(/[,:;]/)
      .map((s) => s.trim())
      .filter(Boolean);

    /** @type {RegExp[]} */
    const regs = [];
    const toRegex = (pat) => {
      if (pat instanceof RegExp) return pat;
      // Escape regex chars, then replace '*' with '.*'
      const esc = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
      return new RegExp(`^${esc}$`);
    };
    for (const p of fromOpts) regs.push(toRegex(p));
    for (const p of fromEnv) regs.push(toRegex(p));

    if (regs.length === 0) return () => false;
    return (name) => regs.some((re) => re.test(name));
  }

  /** @type {(n: import('@babel/types').Node) => boolean} */
  function isTopLevel(path) {
    return !!path.findParent((p) => p.isProgram());
  }

  /**
   * Returns true iff node is a bare `require('x')` call (callee: Identifier 'require', one string literal arg).
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
   * Ensure `const { __lazyRequire } = require(helperModule);` exists once, return the Identifier.
                  console.log(
                    `--- KBN_DEBUG_DEFER_REQUIRES [${
                      filename || '<unknown>'
                    }] START ---\n${code}\n--- KBN_DEBUG_DEFER_REQUIRES END ---`
                  );
   */
  function ensureHelper(programPath, helperModule, helperName, inlineHelper) {
    const progScope = programPath.scope;
    if (progScope.hasBinding(helperName)) {
      return /** @type {import('@babel/types').Identifier} */ (
        progScope.getBinding(helperName).identifier
      );
    }

    // Insert after directives.
    const body = programPath.get('body');
    let insertIndex = 0;
    for (; insertIndex < body.length; insertIndex++) {
      if (!body[insertIndex].isDirective()) break;
    }

    if (inlineHelper !== false) {
      // Build an inline helper function: function __lazyRequire(factory) { ... }
      const factoryId = t.identifier('factory');
      const loadedId = t.identifier('loaded');
      const cacheId = t.identifier('cache');
      const boxId = t.identifier('box');

      const letLoaded = t.variableDeclaration('let', [
        t.variableDeclarator(loadedId, t.booleanLiteral(false)),
      ]);
      const letCache = t.variableDeclaration('let', [t.variableDeclarator(cacheId, null)]);
      const constBox = t.variableDeclaration('const', [
        t.variableDeclarator(boxId, t.objectExpression([])),
      ]);

      // Object.defineProperty(box, 'value', { ... })
      const defineDataProperty = (valExpr) =>
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('Object'), t.identifier('defineProperty')),
            [
              boxId,
              t.stringLiteral('value'),
              t.objectExpression([
                t.objectProperty(t.identifier('configurable'), t.booleanLiteral(true)),
                t.objectProperty(t.identifier('enumerable'), t.booleanLiteral(true)),
                t.objectProperty(t.identifier('writable'), t.booleanLiteral(true)),
                t.objectProperty(t.identifier('value'), valExpr),
              ]),
            ]
          )
        );

      const initialDefine = t.expressionStatement(
        t.callExpression(
          t.memberExpression(t.identifier('Object'), t.identifier('defineProperty')),
          [
            boxId,
            t.stringLiteral('value'),
            t.objectExpression([
              t.objectProperty(t.identifier('configurable'), t.booleanLiteral(true)),
              t.objectProperty(t.identifier('enumerable'), t.booleanLiteral(true)),
              t.objectProperty(
                t.identifier('get'),
                t.functionExpression(
                  null,
                  [],
                  t.blockStatement([
                    // if (!loaded) { cache = factory(); loaded = true; }
                    t.ifStatement(
                      t.unaryExpression('!', loadedId),
                      t.blockStatement([
                        t.expressionStatement(
                          t.assignmentExpression('=', cacheId, t.callExpression(factoryId, []))
                        ),
                        t.expressionStatement(
                          t.assignmentExpression('=', loadedId, t.booleanLiteral(true))
                        ),
                      ])
                    ),
                    // Object.defineProperty(box, 'value', { configurable: true, enumerable: true, writable: true, value: cache });
                    defineDataProperty(cacheId),
                    t.returnStatement(cacheId),
                  ])
                )
              ),
              t.objectProperty(
                t.identifier('set'),
                t.functionExpression(
                  null,
                  [t.identifier('next')],
                  t.blockStatement([
                    // cache = next; loaded = true; Object.defineProperty(... value: next)
                    t.expressionStatement(
                      t.assignmentExpression('=', cacheId, t.identifier('next'))
                    ),
                    t.expressionStatement(
                      t.assignmentExpression('=', loadedId, t.booleanLiteral(true))
                    ),
                    defineDataProperty(t.identifier('next')),
                  ])
                )
              ),
            ]),
          ]
        )
      );

      const fnDecl = t.functionDeclaration(
        t.identifier(helperName),
        [factoryId],
        t.blockStatement([letLoaded, letCache, constBox, initialDefine, t.returnStatement(boxId)])
      );

      programPath.node.body.splice(insertIndex, 0, fnDecl);
      programPath.scope.registerDeclaration(programPath.get('body.' + insertIndex));
      return t.identifier(helperName);
    }

    // Fallback: require the helper from a module
    const decl = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(t.identifier(helperName), t.identifier(helperName), false, true),
        ]),
        t.callExpression(t.identifier('require'), [t.stringLiteral(helperModule)])
      ),
    ]);
    programPath.node.body.splice(insertIndex, 0, decl);
    programPath.scope.registerDeclaration(programPath.get('body.' + insertIndex));
    return t.identifier(helperName);
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
   * @param {import('@babel/core').NodePath<import('@babel/types').VariableDeclarator>} declaratorPath
   * @param {import('@babel/core').NodePath<import('@babel/types').Program>} programPath
   * @param {string} helperModule
   * @param {string} helperName
   * @returns {boolean} whether transformed
   */
  function transformDeclarator(
    declaratorPath,
    programPath,
    helperModule,
    helperName,
    inlineHelper,
    shouldIgnore
  ) {
    const node = declaratorPath.node;
    if (!isTopLevel(declaratorPath)) return false;
    if (!node.init || !t.isExpression(node.init)) return false;

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
    if (shouldIgnore && shouldIgnore(analyzed.moduleName)) return false;

    const helperId = ensureHelper(programPath, helperModule, helperName, inlineHelper);

    // Case 1: const x = <require-ish>;
    if (t.isIdentifier(node.id)) {
      const origName = node.id.name;

      // Only transform if binding is constant (not reassigned)
      const binding = declaratorPath.scope.getBinding(origName);
      if (!binding || !binding.constant) return false;

      // Use the original identifier as the lazy box to keep names stable
      const boxId = node.id;

      // Rewrite all identifier references to `__box.value`
      for (const refPath of binding.referencePaths) {
        replaceRef(refPath, buildBoxRead(boxId, null));
      }

      // Replace this declarator with: const __x = __lazyRequire(() => <originalInit>);
      const lazyInit = t.callExpression(helperId, [
        t.arrowFunctionExpression([], t.cloneNode(analyzed.factoryInner, true)),
      ]);

      const newDecl = t.variableDeclarator(boxId, lazyInit);
      // Preserve comments
      t.inheritsComments(newDecl, node);

      declaratorPath.replaceWith(newDecl);
      return true;
    }

    // Case 2: const { a, b: c } = <require-ish>;
    if (t.isObjectPattern(node.id)) {
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
      const boxId = declaratorPath.scope.generateUidIdentifier(`__${moduleBase}`);

      // Rewrite all references to locals
      for (const { local, remote } of pairs) {
        const b = declaratorPath.scope.getBinding(local);
        if (!b) continue;
        for (const refPath of b.referencePaths) {
          replaceRef(refPath, buildBoxRead(boxId, remote));
        }
      }

      // Replace the whole declarator with: const __mod = __lazyRequire(() => <originalInit>);
      const lazyInit = t.callExpression(helperId, [
        t.arrowFunctionExpression([], t.cloneNode(analyzed.factoryInner, true)),
      ]);

      const newDecl = t.variableDeclarator(boxId, lazyInit);
      t.inheritsComments(newDecl, node);
      declaratorPath.replaceWith(newDecl);
      return true;
    }

    // Other patterns are ignored.
    return false;
  }

  return {
    name: 'babel-plugin-defer-requires',
    inherits: undefined,

    /**
     * @param {PluginOptions} [pluginOptions]
     */
    visitor: {
      Program: {
        exit(programPath, state) {
          // Track simple identifier declarators we transformed, to ensure we catch any missed refs later.
          /** @type {Set<string>} */
          const simpleTransformed = new Set();
          const helperModule = (state.opts && state.opts.helperModule) || './lazy_require_helper';
          const helperName = (state.opts && state.opts.helperName) || '__lazyRequire';
          const inlineHelper = state.opts?.inlineHelper !== false; // default true

          if (state.opts.enabled === false || !!process.env.KBN_DISABLE_DEFER_REQUIRES) {
            return;
          }

          // Fast bail if there are no top-level variable declarations.
          const varDecls = programPath.get('body').filter((p) => p.isVariableDeclaration());
          if (varDecls.length === 0) return;

          // Transform each declarator independently.
          for (const vd of varDecls) {
            /** @type {import('@babel/core').NodePath<import('@babel/types').VariableDeclaration>} */
            const vDeclPath = vd;
            // Compute ignore matcher once per Program
            const shouldIgnore = buildIgnoreMatcher(state);
            for (const declaratorPath of vDeclPath.get('declarations')) {
              const did = transformDeclarator(
                declaratorPath,
                programPath,
                helperModule,
                helperName,
                inlineHelper,
                shouldIgnore
              );
              // Record simple identifier names we transformed so we can do a safety second pass.
              if (did) {
                const n = declaratorPath.node;
                if (n && t.isVariableDeclarator(n) && t.isIdentifier(n.id)) {
                  simpleTransformed.add(n.id.name);
                }
              }
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

          // Optionally wrap styled-components tagged templates to suppress dynamic creation warning
          const disableStyledWarn =
            state?.opts?.disableStyledComponentsDynamicCreationWarning !== false;
          if (disableStyledWarn && boxModuleMap.size > 0) {
            /**
             * Returns true if expr's base object references a lazy box for 'styled-components'.
             * Matches chains like: <box>.value[.default]?.div ... or calls like (<box>.value)(...).
             * @param {import('@babel/types').Expression} expr
             */
            const usesStyledComponents = (expr) => {
              /** @type {import('@babel/types').Expression | null} */
              let e = expr;
              const seen = new Set();
              while (e && !seen.has(e)) {
                seen.add(e);
                if (t.isCallExpression(e)) {
                  e = e.callee;
                  continue;
                }
                if (t.isMemberExpression(e)) {
                  const obj = e.object;
                  // Detect <box>.value...
                  if (
                    t.isMemberExpression(obj) &&
                    t.isIdentifier(obj.object) &&
                    t.isIdentifier(obj.property, { name: 'value' })
                  ) {
                    const boxName = obj.object.name;
                    const mod = boxModuleMap.get(boxName);
                    if (mod === 'styled-components') return true;
                  }
                  // Continue walking up the object chain
                  if (t.isExpression(obj)) {
                    e = obj;
                    continue;
                  }
                  return false;
                }
                // Identifier alone is unlikely after our replacements; treat as non-match
                return false;
              }
              return false;
            };

            /** Build IIFE that sets NODE_ENV='production' for the duration of the tagged template call */
            const buildEnvWrappedTagged = (tag, quasi) => {
              const prevId = programPath.scope.generateUidIdentifier('prevNodeEnv');
              const procEnv = t.memberExpression(t.identifier('process'), t.identifier('env'));
              const procEnvNodeEnv = t.memberExpression(procEnv, t.identifier('NODE_ENV'));

              const savePrev = t.variableDeclaration('const', [
                t.variableDeclarator(prevId, t.cloneNode(procEnvNodeEnv)),
              ]);
              const setProd = t.expressionStatement(
                t.assignmentExpression(
                  '=',
                  t.cloneNode(procEnvNodeEnv),
                  t.stringLiteral('production')
                )
              );
              const restore = t.expressionStatement(
                t.assignmentExpression('=', t.cloneNode(procEnvNodeEnv), t.cloneNode(prevId))
              );

              const ret = t.returnStatement(
                t.taggedTemplateExpression(t.cloneNode(tag, true), t.cloneNode(quasi, true))
              );

              const tryFinally = t.tryStatement(
                t.blockStatement([setProd, ret]),
                null,
                t.blockStatement([restore])
              );

              return t.callExpression(
                t.arrowFunctionExpression([], t.blockStatement([savePrev, tryFinally])),
                []
              );
            };

            programPath.traverse({
              TaggedTemplateExpression(ttPath) {
                const { tag } = ttPath.node;
                if (!t.isExpression(tag)) return;
                if (!usesStyledComponents(tag)) return;
                ttPath.replaceWith(buildEnvWrappedTagged(tag, ttPath.node.quasi));
                // Avoid re-visiting the wrapped subtree (which contains the original TaggedTemplateExpression)
                ttPath.skip();
              },
            });
          }

          // Optional debug: print the transformed output if the filename matches KBN_DEBUG_DEFER_REQUIRES.
          try {
            const filename = state && state.file && state.file.opts && state.file.opts.filename;
            if (shouldDebug(filename)) {
              // Lazy-load generator to avoid overhead when not debugging.
              const generate = require('@babel/generator').default;
              const { code } = generate(programPath.hub.file.ast, {
                compact: false,
                comments: true,
                retainLines: false,
              });
              const header = `--- KBN_DEBUG_DEFER_REQUIRES [${filename || '<unknown>'}] START ---`;

              // eslint-disable-next-line no-console
              console.log(`${header}\n${code}\n--- KBN_DEBUG_DEFER_REQUIRES END ---`);
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[defer-requires] debug print failed:', e && e.message);
          }
        },
      },
    },
  };
};
