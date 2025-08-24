/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Babel 7 plugin: inline ESM imports/exports into usage sites with memoized require() accessors.
 *
 * - Side-effect imports (e.g., `import './x'`) are preserved.
 * - Type-only imports are preserved.
 * - Per-declaration opt-out: add `// inline-require: off` on an import/export line.
 * - Injects a tiny per-module accessor that requires and caches on success only.
 * - Replaces each imported binding's references with an inline call to the accessor.
 * - Handles ESM exports, including re-exports and `export *`/`export * as ns`.
 * - Runs after @babel/preset-typescript (with namespaces enabled) and after @babel/preset-react.
 *
 * Caveats:
 * - Namespace interop mimics ESM namespaces (getters + freeze) at runtime, sufficient for most cases.
 * - Default interop is inlined per usage (no global helper) to keep the single required helper minimal.
 *
 * @param {import('@babel/core')} babel
 */
module.exports = function inlineRequiresPlugin(babel) {
  const { types: t, template } = babel;

  /**
   * Check if we should print the transformed output for this file based on KBN_DEBUG_INLINE_REWRITE.
   * The env var accepts a delimited list ("," or path delimiter like ":") of substrings; if any
   * substring matches the absolute filename, the plugin will print the transformed code to stdout.
   * @param {string|undefined} filename
   */
  function shouldDebug(filename) {
    if (!filename) return false;
    const raw = process.env.KBN_DEBUG_INLINE_REWRITE;
    if (!raw) return false;
    // Support comma and platform path delimiter (":" on POSIX, ";" on Windows)
    const parts = raw
      .split(/[,:;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return false;
    return parts.some((p) => filename.includes(p));
  }

  /** @typedef {{ moduleId: import('@babel/types').Identifier, nsId?: import('@babel/types').Identifier }} AccessorInfo */

  /**
   * Check for an opt-out pragma on the given path.
   * @param {import('@babel/traverse').NodePath} path
   * @returns {boolean}
   */
  function hasOptOut(path) {
    const n = path.node;
    const comments = [].concat(n.leadingComments || []).concat(n.trailingComments || []);
    return comments.some((c) => /inline-require:\s*off/i.test(c.value));
  }

  /**
   * Is an ImportDeclaration entirely type-only?
   * @param {import('@babel/types').ImportDeclaration} node
   */
  function isTypeOnlyImport(node) {
    if (node.importKind === 'type') return true;
    if (!node.specifiers || node.specifiers.length === 0) return false;
    return node.specifiers.every((s) => s.importKind === 'type');
  }

  /**
   * Is a side-effect-only import (has no specifiers)?
   * @param {import('@babel/types').ImportDeclaration} node
   */
  function isSideEffectOnly(node) {
    return node.specifiers.length === 0;
  }

  /**
   * Build a safe, deterministic uid from a module source string.
   * @param {import('@babel/traverse').NodePath} programPath
   * @param {string} source
   */
  function makeModuleUid(programPath, source) {
    const base =
      source
        .replace(/[^a-zA-Z0-9_$]/g, '_')
        .replace(/^_+/, '')
        .slice(-40) || 'mod';
    return programPath.scope.generateUidIdentifier(`mod_${base}`);
  }

  /**
   * Ensure the per-module accessor exists (memoized require that caches only on success).
   * Returns the Identifier for the accessor function (to be called with no args).
   *
   * function _mod_xyz() {
   *   try {
   *     var m = require("xyz");
   *     _mod_xyz = function(){ return m; };
   *     return m;
   *   } catch (e) { throw e; }
   * }
   *
   * @param {import('@babel/traverse').NodePath} programPath
   * @param {Map<string, AccessorInfo>} accessors
   * @param {string} source
   * @returns {import('@babel/types').Identifier}
   */
  function ensureModuleAccessor(programPath, accessors, source) {
    const existing = accessors.get(source);
    if (existing) return existing.moduleId;

    const id = makeModuleUid(programPath, source);
    const fn = t.functionDeclaration(
      id,
      [],
      t.blockStatement([
        t.tryStatement(
          t.blockStatement([
            t.variableDeclaration('var', [
              t.variableDeclarator(
                t.identifier('m'),
                t.callExpression(t.identifier('require'), [t.stringLiteral(source)])
              ),
            ]),
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                id,
                t.functionExpression(
                  null,
                  [],
                  t.blockStatement([t.returnStatement(t.identifier('m'))])
                )
              )
            ),
            t.returnStatement(t.identifier('m')),
          ]),
          t.catchClause(t.identifier('e'), t.blockStatement([t.throwStatement(t.identifier('e'))]))
        ),
      ])
    );

    // Insert at the top of the program, after "use strict" if present.
    const body = programPath.get('body');
    let insertIndex = 0;
    if (
      body.length &&
      body[0].isExpressionStatement() &&
      t.isStringLiteral(body[0].node.expression)
    ) {
      insertIndex = 1;
    }
    programPath.node.body.splice(insertIndex, 0, fn);

    accessors.set(source, { moduleId: id });
    return id;
  }

  /**
   * Ensure a namespace accessor exists for a source (ESM-like namespace object).
   * Builds from the per-module accessor and memoizes the synthetic namespace.
   *
   * function _ns_xyz(){ const m=_mod_xyz(); const ns=...; _ns_xyz=()=>ns; return ns; }
   *
   * @param {import('@babel/traverse').NodePath} programPath
   * @param {Map<string, AccessorInfo>} accessors
   * @param {string} source
   * @returns {import('@babel/types').Identifier}
   */
  function ensureNamespaceAccessor(programPath, accessors, source) {
    const info = accessors.get(source);
    const modId = ensureModuleAccessor(programPath, accessors, source);
    if (info && info.nsId) return info.nsId;

    const nsId = programPath.scope.generateUidIdentifier(`${modId.name}_ns`);
    // Return the real module object so jest.spyOn(ns, 'x') affects MOD().x too
    const build = template.statements(`
      function NS() {
        const ns = MOD();
        NS = function(){ return ns; };
        return ns;
      }
    `);
    const [fn] = build({ NS: nsId, MOD: modId });

    // Insert after module accessor to satisfy dependency order.
    const programBody = programPath.get('body');
    let insertAfter = 0;
    for (let i = 0; i < programBody.length; i++) {
      if (
        t.isFunctionDeclaration(programBody[i].node) &&
        programBody[i].node.id &&
        programBody[i].node.id.name === modId.name
      ) {
        insertAfter = i + 1;
        break;
      }
    }
    programPath.node.body.splice(insertAfter, 0, fn);

    const newInfo = accessors.get(source) || { moduleId: modId };
    newInfo.nsId = nsId;
    accessors.set(source, newInfo);
    return nsId;
  }

  /**
   * Ensure and call a shared default interop helper.
   * Emits one helper per file: function _interopDefault(m){ return m && m.__esModule ? m.default : m; }
   * Replaces per-usage inline IIFE with a simple call: _interopDefault(MOD())
   * @param {import('@babel/traverse').NodePath} programPath
   * @param {any} state
   * @param {import('@babel/types').Expression} modCall
   */
  function buildDefaultInterop(programPath, state, modCall) {
    const helperId = ensureDefaultInteropHelper(programPath, state);
    return t.callExpression(helperId, [modCall]);
  }

  /**
   * Insert (once per file) and return the Identifier for the default interop helper:
   *   function _interopDefault(m) { return m && m.__esModule ? m.default : m; }
   * @param {import('@babel/traverse').NodePath} programPath
   * @param {any} state
   * @returns {import('@babel/types').Identifier}
   */
  function ensureDefaultInteropHelper(programPath, state) {
    if (state.defaultInteropId) return state.defaultInteropId;
    const id = programPath.scope.generateUidIdentifier('interopDefault');
    const mId = t.identifier('m');
    const fn = t.functionDeclaration(
      id,
      [mId],
      t.blockStatement([
        t.returnStatement(
          t.conditionalExpression(
            t.logicalExpression('&&', mId, t.memberExpression(mId, t.identifier('__esModule'))),
            t.memberExpression(mId, t.identifier('default')),
            mId
          )
        ),
      ])
    );

    // Insert at the top of the program, after "use strict" if present.
    const body = programPath.get('body');
    let insertIndex = 0;
    if (
      body.length &&
      body[0].isExpressionStatement() &&
      t.isStringLiteral(body[0].node.expression)
    ) {
      insertIndex = 1;
    }
    programPath.node.body.splice(insertIndex, 0, fn);

    state.defaultInteropId = id;
    return id;
  }

  /**
   * Replace a binding reference path with a given value expression, handling shorthand object props.
   * @param {import('@babel/traverse').NodePath<import('@babel/types').Identifier>} refPath
   * @param {import('@babel/types').Expression} replacement
   */
  function replaceRef(refPath, replacement) {
    const parent = refPath.parentPath;
    if (
      parent &&
      parent.isObjectProperty({ shorthand: true }) &&
      parent.node.key === refPath.node &&
      parent.node.value === refPath.node
    ) {
      // Turn { a } into { a: REPLACEMENT }
      parent.replaceWith(
        t.objectProperty(parent.node.key, replacement, parent.node.computed, false)
      );
      return;
    }
    refPath.replaceWith(replacement);
  }

  /** Determine whether a reference path is within a TypeScript type position. */
  function isInTSTypePosition(refPath) {
    return !!refPath.findParent((p) =>
      p.isTSTypeAnnotation() ||
      p.isTSTypeReference() ||
      p.isTSTypeQuery() ||
      p.isTSQualifiedName() ||
      p.isTSTypeAliasDeclaration() ||
      p.isTSInterfaceDeclaration() ||
      p.isTSImportType() ||
      p.isTSExpressionWithTypeArguments() ||
      p.isTSIndexedAccessType() ||
      p.isTSArrayType() ||
      p.isTSTupleType() ||
      p.isTSUnionType() ||
      p.isTSIntersectionType() ||
      p.isTSConditionalType() ||
      p.isTSMappedType() ||
      p.isTSLiteralType()
    );
  }

  /**
   * Build: Object.defineProperty(exports, "NAME", { enumerable: true, get: function(){ return EXPR; }});
   * @param {string} name
   * @param {import('@babel/types').Expression} expr
   */
  function buildExportGetter(name, expr) {
    return t.expressionStatement(
      t.callExpression(t.memberExpression(t.identifier('Object'), t.identifier('defineProperty')), [
        t.identifier('exports'),
        t.stringLiteral(name),
        t.objectExpression([
          t.objectProperty(t.identifier('enumerable'), t.booleanLiteral(true)),
          t.objectProperty(t.identifier('configurable'), t.booleanLiteral(true)),
          t.objectProperty(
            t.identifier('get'),
            t.functionExpression(null, [], t.blockStatement([t.returnStatement(expr)]))
          ),
        ]),
      ])
    );
  }

  /**
   * Build: for (const k in MOD()) { ...defineProperty(exports, k, {get: ()=>MOD()[k]}) }
   * (protect default/__esModule and existing export keys)
   * @param {import('@babel/types').Identifier} modId
   */
  function buildExportAll(modId) {
    return template.statements(`
      for (const k in MOD()) {
        if (k === "default" || k === "__esModule") continue;
        if (Object.prototype.hasOwnProperty.call(exports, k)) continue;
        Object.defineProperty(exports, k, {
          enumerable: true,
          configurable: true,
          get: function(){ return MOD()[k]; }
        });
      }
    `)({ MOD: modId });
  }

  return {
    name: 'inline-require-usage',
    visitor: {
      Program: {
        enter(programPath, state) {
          /** @type {Map<string, AccessorInfo>} */
          state.accessors = new Map();
          /** @type {Set<import('@babel/types').ImportDeclaration>} */
          state.toRemoveImports = new Set();
          /** @type {Set<import('@babel/traverse').NodePath>} */
          state.pathsToRemove = new Set();
          /** @type {import('@babel/types').Identifier | undefined} */
          state.defaultInteropId = undefined;

          // If the file uses TypeScript namespaces, skip all transforms for simplicity.
          // Babel represents both `namespace` and `module` TS namespaces as TSModuleDeclaration.
          state.skipFile = false;
          try {
            programPath.traverse({
              TSModuleDeclaration(p) {
                state.skipFile = true;
                p.stop();
              },
            });
          } catch (_) {
            // ignore
          }
        },
        exit(programPath, state) {
          if (state.skipFile) {
            // Still allow debug printing if enabled, but skip any rewrites/cleanup.
            try {
              const filename = state && state.file && state.file.opts && state.file.opts.filename;
              if (shouldDebug(filename)) {
                const generate = require('@babel/generator').default;
                const { code } = generate(programPath.hub.file.ast, {
                  compact: false,
                  comments: true,
                  retainLines: false,
                });
                // eslint-disable-next-line no-console
                console.log(
                  `--- KBN_DEBUG_INLINE_REWRITE [${filename || '<unknown>'}] START ---\n${code}\n--- KBN_DEBUG_INLINE_REWRITE END ---`
                );
              }
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn('[inline-require-usage] debug print failed:', e && e.message);
            }
            return;
          }

          // Cleanup: remove any now-unreferenced import specifiers/declarations (except side-effect or opted-out/type-only).
          programPath.get('body').forEach((stmtPath) => {
            if (!stmtPath.isImportDeclaration()) return;
            const node = stmtPath.node;

            // Skip untouched categories
            if (hasOptOut(stmtPath) || isSideEffectOnly(node) || isTypeOnlyImport(node)) return;

            const keepSpecifiers = [];
            for (const s of node.specifiers) {
              const local = s.local && s.local.name;
              if (!local) {
                keepSpecifiers.push(s);
                continue;
              }
              const binding = stmtPath.scope.getBinding(local);
              if (binding && binding.referenced) {
                keepSpecifiers.push(s);
              }
            }
            if (keepSpecifiers.length === 0) {
              stmtPath.remove();
            } else if (keepSpecifiers.length !== node.specifiers.length) {
              stmtPath.replaceWith(
                t.importDeclaration(keepSpecifiers, node.source, node.importKind || null)
              );
            }
          });

          // Optional debug: print the transformed output if the filename matches KBN_DEBUG_INLINE_REWRITE.
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
              // Print with clear markers and filename for grep-friendly output.
              // eslint-disable-next-line no-console
              console.log(
                `--- KBN_DEBUG_INLINE_REWRITE [${filename || '<unknown>'}] START ---\n${code}\n--- KBN_DEBUG_INLINE_REWRITE END ---`
              );
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[inline-require-usage] debug print failed:', e && e.message);
          }
        },
      },

      /**
       * Imports: visit, then replace references of their bindings with accessor calls.
       */
      ImportDeclaration(path, state) {
        if (state.skipFile) return;
        const node = path.node;
        if (hasOptOut(path)) return; // leave intact
        if (isSideEffectOnly(node)) return; // leave side-effect imports alone
        if (isTypeOnlyImport(node)) return; // leave type-only

        const source = node.source.value;
        const programPath = path.findParent((p) => p.isProgram());
        const accessors = state.accessors;

        // Track which specifiers we fully inlined so we can later remove them.
        /** @type {Set<string>} */
        const fullyInlinedLocals = new Set();

        node.specifiers.forEach((s) => {
          const localId = s.local && s.local.name;
          if (!localId) return;

          const binding = path.scope.getBinding(localId);
          if (!binding) return;

          // If there are no (value) references, do nothing now; cleanup will drop the specifier later if unused.
          const refs = binding.referencePaths || [];
          if (refs.length === 0) return;

          // Prepare accessors
          const modId = ensureModuleAccessor(programPath, accessors, source);

          let didReplace = false;
          if (t.isImportDefaultSpecifier(s)) {
            refs.forEach((refPath) => {
              if (isInTSTypePosition(refPath)) return;
              const expr = buildDefaultInterop(programPath, state, t.callExpression(modId, []));
              replaceRef(refPath, expr);
              didReplace = true;
            });
            if (didReplace) fullyInlinedLocals.add(localId);
          } else if (t.isImportNamespaceSpecifier(s)) {
            const nsId = ensureNamespaceAccessor(programPath, accessors, source);
            refs.forEach((refPath) => {
              if (isInTSTypePosition(refPath)) return;
              replaceRef(refPath, t.callExpression(nsId, []));
              didReplace = true;
            });
            if (didReplace) fullyInlinedLocals.add(localId);
          } else if (t.isImportSpecifier(s)) {
            // Named import
            const importedName =
              s.imported && t.isIdentifier(s.imported) ? s.imported.name : s.imported.value;
            refs.forEach((refPath) => {
              if (isInTSTypePosition(refPath)) return;
              const expr = t.memberExpression(
                t.callExpression(modId, []),
                t.identifier(importedName)
              );
              replaceRef(refPath, expr);
              didReplace = true;
            });
            if (didReplace) fullyInlinedLocals.add(localId);
          }
        });

        // If some specifiers were fully inlined, trim them here (others may remain).
        if (fullyInlinedLocals.size > 0) {
          const remaining = node.specifiers.filter(
            (s) => !fullyInlinedLocals.has(s.local && s.local.name)
          );
          if (remaining.length === 0) {
            // If there were also type-only specifiers mixed in, we should keep them,
            // but Babel 7 keeps type-only via importKind/specifier.importKind; since we skipped type-only above, safe to remove.
            path.remove();
          } else {
            path.replaceWith(t.importDeclaration(remaining, node.source, node.importKind || null));
          }
        }
      },

      /**
       * export * from '...'
       */
      ExportAllDeclaration(path, state) {
        if (state.skipFile) return;
        if (hasOptOut(path)) return;
        const source = path.node.source.value;
        const programPath = path.findParent((p) => p.isProgram());
        const modId = ensureModuleAccessor(programPath, state.accessors, source);
        const stmts = buildExportAll(modId);
        // Preserve comments on the original export
        if (path.node.leadingComments) stmts[0].leadingComments = path.node.leadingComments;
        if (path.node.trailingComments)
          stmts[stmts.length - 1].trailingComments = path.node.trailingComments;
        path.replaceWithMultiple(stmts);
      },

      /**
       * export { ... } from '...'
       * export { local as exported }    (local may be an imported binding)
       */
      ExportNamedDeclaration(path, state) {
        if (state.skipFile) return;
        if (hasOptOut(path)) return;

        const programPath = path.findParent((p) => p.isProgram());

        // Case 1: Re-export from source: export { a as b } from 'm'
        if (path.node.source) {
          const source = path.node.source.value;
          const modId = ensureModuleAccessor(programPath, state.accessors, source);

          const getters = [];
          for (const spec of path.node.specifiers) {
            const exportedName = spec.exported.name || spec.exported.value;
            // Handle: export * as NS from '...'
            if (t.isExportNamespaceSpecifier(spec)) {
              const nsId = ensureNamespaceAccessor(programPath, state.accessors, source);
              getters.push(
                t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    t.memberExpression(t.identifier('exports'), t.identifier(exportedName)),
                    t.callExpression(nsId, [])
                  )
                )
              );
              continue;
            }

            let valueExpr;
            if (t.isIdentifier(spec.local) && spec.local.name === 'default') {
              valueExpr = buildDefaultInterop(programPath, state, t.callExpression(modId, []));
            } else if (t.isIdentifier(spec.local)) {
              valueExpr = t.memberExpression(
                t.callExpression(modId, []),
                t.identifier(spec.local.name)
              );
            } else {
              // string literal imported (rare)
              const localVal = spec.local && spec.local.value;
              valueExpr = t.memberExpression(
                t.callExpression(modId, []),
                t.identifier(String(localVal))
              );
            }
            getters.push(buildExportGetter(exportedName, valueExpr));
          }
          // Replace with defineProperty getters
          path.replaceWithMultiple(getters);
          return;
        }

        // Case 2: export { local as exported } where local might be an imported binding.
        const remainingSpecs = [];
        const addedGetters = [];

        for (const spec of path.node.specifiers) {
          const localName = spec.local.name;
          const exportedName = spec.exported.name || spec.exported.value;

          const binding = path.scope.getBinding(localName);
          if (
            !binding ||
            !binding.path ||
            (!binding.path.isImportSpecifier() &&
              !binding.path.isImportDefaultSpecifier() &&
              !binding.path.isImportNamespaceSpecifier())
          ) {
            // Not re-exporting an imported binding; keep as-is.
            remainingSpecs.push(spec);
            continue;
          }

          // Imported binding: rewrite to a getter from its source module accessor.
          const importDecl = binding.path.parentPath.node; // ImportDeclaration
          if (hasOptOut(binding.path.parentPath) || isTypeOnlyImport(importDecl)) {
            // Respect opt-out/type-only; keep original export spec.
            remainingSpecs.push(spec);
            continue;
          }

          const source = importDecl.source.value;
          const modId = ensureModuleAccessor(programPath, state.accessors, source);

          let valueExpr;
          if (binding.path.isImportDefaultSpecifier()) {
            valueExpr = buildDefaultInterop(programPath, state, t.callExpression(modId, []));
          } else if (binding.path.isImportNamespaceSpecifier()) {
            const nsId = ensureNamespaceAccessor(programPath, state.accessors, source);
            valueExpr = t.callExpression(nsId, []);
          } else if (binding.path.isImportSpecifier()) {
            const impName = binding.path.node.imported.name || binding.path.node.imported.value;
            valueExpr = t.memberExpression(t.callExpression(modId, []), t.identifier(impName));
          }

          addedGetters.push(buildExportGetter(exportedName, valueExpr));
        }

        if (addedGetters.length > 0) {
          if (remainingSpecs.length === 0) {
            // Replace whole export with our getters
            path.replaceWithMultiple(addedGetters);
          } else {
            // Keep remaining specifiers and insert getters before/after (preserve order: getters where the export was)
            path.insertBefore(addedGetters);
            path.replaceWith(t.exportNamedDeclaration(null, remainingSpecs));
          }
        }
      },

      /**
       * export * as ns from '...'
       * (Babel parses this as ExportNamedDeclaration with ExportNamespaceSpecifier in specifiers)
       */
      ExportNamespaceSpecifier(path, state) {
        // This visitor isn't called directly; ExportNamedDeclaration above handles it via node.source.
      },
    },
  };
};
