/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = function inlineCommonJsRequire({ types: t }) {
  function isRequireCall(node) {
    return (
      t.isCallExpression(node) &&
      t.isIdentifier(node.callee, { name: 'require' }) &&
      node.arguments.length === 1 &&
      t.isStringLiteral(node.arguments[0])
    );
  }

  function isHelperModuleLiteral(lit) {
    if (!lit || typeof lit.value !== 'string') return false;

    const s = lit.value;

    // Avoid transforming Babel runtime/helpers which are used for interop
    if (s.includes('babel') || s.includes('@kbn') || s.includes('setup_node_env')) {
      return true;
    }
    return false;
  }

  function shouldTransformFile(state) {
    const f = state && state.file && state.file.opts && state.file.opts.filename;

    if (!f) return false;

    if (f.includes('/node_modules/')) return false;

    // Optionally skip test files/specs to avoid interfering with Jest mocks/spies
    if (f.includes('@kbn')) return false;
    if (f.includes('/src/setup_node_env/')) return false;
    if (f.includes('/scripts/')) return false;
    if (f.includes('/public/')) return false;

    return true;
  }

  function isBareModuleSpecifierLiteral(lit) {
    if (!lit || typeof lit.value !== 'string') return false;

    const s = lit.value;

    // Bare specifiers are package/module names, not relative or absolute paths
    return !(s.startsWith('./') || s.startsWith('../') || s.startsWith('/'));
  }

  function ensureDeferRequireHelper(path) {
    let prog = path.findParent((p) => p.isProgram());

    if (!prog && typeof path.isProgram === 'function' && path.isProgram()) {
      prog = path;
    }

    if (prog.getData('addedDeferRequire')) return;

    const moduleId = t.identifier('module');

    /**
     * `deferRequire` helper implemented using Proxy to lazily load modules and forward operations.

    * Example of the helper injected into transformed files:
     *
     * function deferRequire(module) {
     *   let __loaded = false;
     *   let __cache;
     *   function __load() {
     *     if (!__loaded) {
     *       __cache = require(module);
     *       __loaded = true;
     *     }
     *   }
     *   const __handler = {
     *     get(target, prop) {
     *       if (prop === 'value') {
     *         __load();
     *         return __cache;
     *       }
     *       __load();
     *       return __cache[prop];
     *     },
     *     set(target, prop, value) {
     *       __load();
     *       __cache[prop] = value;
     *       return true;
     *     },
     *     has(target, prop) {
     *       __load();
     *       return prop in __cache;
     *     },
     *     ownKeys() {
     *       __load();
     *       return Reflect.ownKeys(__cache);
     *     },
     *     getOwnPropertyDescriptor(target, prop) {
     *       __load();
     *       const d = Object.getOwnPropertyDescriptor(__cache, prop);
     *       if (d) d.configurable = true;
     *       return d;
     *     },
     *   };
     *   const __proxyTarget = {};
     *   return new Proxy(__proxyTarget, __handler);
     * }
     */

    const loadedId = t.identifier('__loaded');
    const cacheId = t.identifier('__cache');
    const loadFnId = t.identifier('__load');
    const handlerId = t.identifier('__handler');
    const proxyTargetId = t.identifier('__proxyTarget');

    // function __load() { if (!__loaded) { __cache = require(module); __loaded = true; } }
    const loadFn = t.functionDeclaration(
      loadFnId,
      [],
      t.blockStatement([
        t.ifStatement(
          t.unaryExpression('!', loadedId),
          t.blockStatement([
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                cacheId,
                t.callExpression(t.identifier('require'), [moduleId])
              )
            ),
            t.expressionStatement(t.assignmentExpression('=', loadedId, t.booleanLiteral(true))),
          ])
        ),
      ])
    );

    // const __handler = { get, set }
    const targetId = t.identifier('target');
    const propId = t.identifier('prop');
    const receiverId = t.identifier('receiver');

    const handler = t.variableDeclaration('const', [
      t.variableDeclarator(
        handlerId,
        t.objectExpression([
          // get(target, prop, receiver) { if (prop === 'value') { __load(); return __cache; } __load(); return __cache[prop]; }
          t.objectMethod(
            'method',
            t.identifier('get'),
            [targetId, propId, receiverId],
            t.blockStatement([
              t.ifStatement(
                t.binaryExpression('===', propId, t.stringLiteral('value')),
                t.blockStatement([
                  t.expressionStatement(t.callExpression(loadFnId, [])),
                  t.returnStatement(cacheId),
                ])
              ),
              t.expressionStatement(t.callExpression(loadFnId, [])),
              t.returnStatement(t.memberExpression(cacheId, propId, true)),
            ])
          ),

          // set(target, prop, value) { __load(); __cache[prop] = value; return true; }
          t.objectMethod(
            'method',
            t.identifier('set'),
            [targetId, propId, t.identifier('value')],
            t.blockStatement([
              t.expressionStatement(t.callExpression(loadFnId, [])),
              t.expressionStatement(
                t.assignmentExpression(
                  '=',
                  t.memberExpression(cacheId, propId, true),
                  t.identifier('value')
                )
              ),
              t.returnStatement(t.booleanLiteral(true)),
            ])
          ),

          // has(target, prop) { __load(); return prop in __cache; }
          t.objectMethod(
            'method',
            t.identifier('has'),
            [targetId, propId],
            t.blockStatement([
              t.expressionStatement(t.callExpression(loadFnId, [])),
              t.returnStatement(t.binaryExpression('in', propId, cacheId)),
            ])
          ),

          // ownKeys(target) { __load(); return Reflect.ownKeys(__cache); }
          t.objectMethod(
            'method',
            t.identifier('ownKeys'),
            [targetId],
            t.blockStatement([
              t.expressionStatement(t.callExpression(loadFnId, [])),
              t.returnStatement(
                t.callExpression(
                  t.memberExpression(t.identifier('Reflect'), t.identifier('ownKeys')),
                  [cacheId]
                )
              ),
            ])
          ),

          // getOwnPropertyDescriptor(target, prop) { __load(); const d = Object.getOwnPropertyDescriptor(__cache, prop); if (d) d.configurable = true; return d; }
          t.objectMethod(
            'method',
            t.identifier('getOwnPropertyDescriptor'),
            [targetId, propId],
            t.blockStatement([
              t.expressionStatement(t.callExpression(loadFnId, [])),
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  t.identifier('d'),
                  t.callExpression(
                    t.memberExpression(
                      t.identifier('Object'),
                      t.identifier('getOwnPropertyDescriptor')
                    ),
                    [cacheId, propId]
                  )
                ),
              ]),
              t.ifStatement(
                t.identifier('d'),
                t.blockStatement([
                  t.expressionStatement(
                    t.assignmentExpression(
                      '=',
                      t.memberExpression(t.identifier('d'), t.identifier('configurable')),
                      t.booleanLiteral(true)
                    )
                  ),
                ])
              ),
              t.returnStatement(t.identifier('d')),
            ])
          ),
        ])
      ),
    ]);

    // const __proxyTarget = {};
    const proxyTarget = t.variableDeclaration('const', [
      t.variableDeclarator(proxyTargetId, t.objectExpression([])),
    ]);

    const fn = t.functionDeclaration(
      t.identifier('deferRequire'),
      [moduleId],
      t.blockStatement([
        t.variableDeclaration('let', [t.variableDeclarator(loadedId, t.booleanLiteral(false))]),
        t.variableDeclaration('let', [t.variableDeclarator(cacheId, t.identifier('undefined'))]),
        loadFn,
        handler,
        proxyTarget,
        t.returnStatement(t.newExpression(t.identifier('Proxy'), [proxyTargetId, handlerId])),
      ])
    );

    prog.unshiftContainer('body', fn);
    prog.setData('addedDeferRequire', true);
  }

  // Note: we intentionally avoid a destructured member helper to keep memory low during tests

  function transformTopLevelVarDecl(path) {
    if (!path.parentPath.isProgram()) return;

    const prog = path.findParent((p) => p.isProgram());

    const enabled = shouldTransformFile(path.hub && path.hub.file ? path.hub : { file: {} });

    if (!enabled) return;

    const tracked = prog.getData('deferTracked') || new Set();

    prog.setData('deferTracked', tracked);

    const out = [];

    let changed = false;

    for (const d of path.node.declarations) {
      const init = d.init;

      if (!init || !isRequireCall(init)) {
        out.push(t.variableDeclaration(path.node.kind, [t.cloneNode(d, true)]));
        continue;
      }

      const arg0 = init.arguments[0];

      // Skip node_modules: bare module specifiers and known helpers
      if (isBareModuleSpecifierLiteral(arg0) || isHelperModuleLiteral(arg0)) {
        out.push(t.variableDeclaration(path.node.kind, [t.cloneNode(d, true)]));
        continue;
      }

      if (t.isIdentifier(d.id)) {
        ensureDeferRequireHelper(path);
        tracked.add(d.id.name);
        if (process.env.KBN_BABEL_DEBUG === '1') {
          try {
            const f =
              (path.hub && path.hub.file && path.hub.file.opts && path.hub.file.opts.filename) ||
              '';
            // eslint-disable-next-line no-console
            console.log(
              '[kbn-require-transformer] deferring require for',
              d.id.name,
              'in',
              f,
              '->',
              arg0.value
            );
          } catch (e) {
            // ignore logging errors
          }
        }
        const call = t.callExpression(t.identifier('deferRequire'), [arg0]);

        out.push(t.variableDeclaration(path.node.kind, [t.variableDeclarator(d.id, call)]));

        changed = true;
      } else if (t.isObjectPattern(d.id)) {
        // Skip transforming destructured requires to preserve semantics and avoid heavy expansion
        out.push(t.variableDeclaration(path.node.kind, [t.cloneNode(d, true)]));
      } else {
        // Unknown pattern, keep as-is
        out.push(t.variableDeclaration(path.node.kind, [t.cloneNode(d, true)]));
      }
    }

    if (changed) {
      path.replaceWithMultiple(out);
    }
  }

  function rewriteMemberExpression(path) {
    const prog = path.findParent((p) => p.isProgram());
    const tracked = prog.getData('deferTracked');
    if (!tracked) return;

    // Walk to the left-most object of the member chain
    function getLeftMostObject(p) {
      let cur = p.get('object');
      while (cur && (cur.isMemberExpression() || cur.isOptionalMemberExpression())) {
        cur = cur.get('object');
      }

      // Handle (0, id) wrapper patterns
      if (cur && cur.isSequenceExpression()) {
        const exprs = cur.get('expressions');
        if (exprs && exprs.length > 0) {
          return exprs[exprs.length - 1];
        }
      }
      return cur;
    }

    const left = getLeftMostObject(path);

    if (!left) return;

    if (left.isIdentifier() && tracked.has(left.node.name)) {
      // If the immediate property on the left is already `.value`, skip
      // We need to detect patterns like left.parent is MemberExpression with property 'value'
      const parent = left.parentPath;

      if (
        parent &&
        parent.isMemberExpression() &&
        !parent.node.computed &&
        t.isIdentifier(parent.node.property, { name: 'value' })
      ) {
        return;
      }
      left.replaceWith(t.memberExpression(t.identifier(left.node.name), t.identifier('value')));
    }
  }

  function maybeDumpFinal(path, state) {
    try {
      if (process.env.KBN_BABEL_DUMP_FINAL !== '1') return;
      const fname = (state && state.file && state.file.opts && state.file.opts.filename) || '';
      const match = process.env.KBN_BABEL_DUMP_MATCH;
      if (match && !fname.includes(match)) return;
      const generate = require('@babel/generator').default;
      const out = generate(path.node, { retainLines: true }, state.file && state.file.code);
      // eslint-disable-next-line no-console
      console.log('\n[kbn-require-transformer:final]:', fname, '\n' + out.code + '\n');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[kbn-require-transformer:dump-final] failed:', e && e.message);
    }
  }

  return {
    name: 'inline-commonjs-require',
    visitor: {
      Program: {
        enter(path) {
          // seed tracked set to ensure availability during traversal
          if (!path.getData('deferTracked')) path.setData('deferTracked', new Set());
        },
        exit(path, state) {
          // Only inject the deferRequire helper if this file had qualifying top-level requires
          const tracked = path.getData('deferTracked');
          if (tracked && tracked.size > 0) {
            ensureDeferRequireHelper(path);
          }

          // Dump the final code if requested
          maybeDumpFinal(path, state);
        },
      },
      VariableDeclaration(path) {
        transformTopLevelVarDecl(path);
      },
      MemberExpression(path) {
        rewriteMemberExpression(path);
      },
    },
  };
};
