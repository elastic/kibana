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

  function shouldTransformFile(state) {
    const f = state.file && state.file.opts && state.file.opts.filename;
    if (!f) return false;
    // Avoid early bootstrap and browser code paths
    if (f.includes('/src/setup_node_env/')) return false;
    if (f.includes('/scripts/')) return false;
    if (f.includes('/public/')) return false;

    return true;
  }

  function ensureHelper(path) {
    const prog = path.findParent((p) => p.isProgram());

    if (!prog.getData('addedHelper')) {
      // function deferRequire(module) { return { get value() { const m = require(module); this.value = m; return m; }, set value(m) { this.value = m; } } }
      const paramId = t.identifier('module');

      const mId = t.identifier('m');

      const requireCall = t.callExpression(t.identifier('require'), [paramId]);

      const mDecl = t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier('m'), requireCall),
      ]);

      const assignGetter = t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(t.thisExpression(), t.identifier('value')),
          t.identifier('m')
        )
      );

      const retM = t.returnStatement(t.identifier('m'));

      const getter = t.objectMethod(
        'get',
        t.identifier('value'),
        [],
        t.blockStatement([mDecl, assignGetter, retM])
      );

      const assignSetter = t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(t.thisExpression(), t.identifier('value')),
          mId
        )
      );

      const setter = t.objectMethod(
        'set',
        t.identifier('value'),
        [mId],
        t.blockStatement([assignSetter])
      );

      const obj = t.objectExpression([getter, setter]);
      const ret = t.returnStatement(obj);

      const fn = t.functionDeclaration(
        t.identifier('deferRequire'),
        [paramId],
        t.blockStatement([ret])
      );

      prog.unshiftContainer('body', fn);
      prog.setData('addedHelper', true);
    }
  }

  function transformDeclarator(path, decl, tracked) {
    const init = decl.init;

    if (!init) return null;

    // Pattern: const { a } = require('pkg'); -> const { a } = deferRequire('pkg'); and track a
    if (t.isObjectPattern(decl.id) && isRequireCall(init)) {
      ensureHelper(path);

      // Track bound identifiers
      for (const prop of decl.id.properties) {
        if (t.isObjectProperty(prop)) {
          const id = prop.value;

          if (t.isIdentifier(id)) {
            tracked.add(id.name);
          }
        } else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
          tracked.add(prop.argument.name);
        }
      }
      const call = t.callExpression(t.identifier('deferRequire'), [init.arguments[0]]);
      const newDecl = t.variableDeclarator(decl.id, call);

      return [t.variableDeclaration(path.node.kind, [newDecl])];
    }

    return null;
  }

  return {
    name: 'inline-commonjs-require',
    visitor: {
      Program(path, state) {
        path.setData('enabled', shouldTransformFile(state));
      },

      // Only mutate top-level declarations
      VariableDeclaration(path) {
        if (!path.parentPath.isProgram()) return;

        const enabled = path.findParent((p) => p.isProgram()).getData('enabled');

        if (!enabled) return;

        const out = [];

        const prog = path.findParent((p) => p.isProgram());
        const tracked = prog.getData('deferTracked') || new Set();

        prog.setData('deferTracked', tracked);

        for (const decl of path.node.declarations) {
          const res = transformDeclarator(path, decl, tracked);

          if (res) {
            // res is [tmpDecl, varDecl], emit in place
            out.push(...res);
          } else {
            // keep original declarator, but as its own declaration to preserve order
            out.push(t.variableDeclaration(path.node.kind, [decl]));
          }
        }

        // If any change was made (i.e. out length differs or we split multi-decl), replace
        if (
          out.length !== 1 ||
          !t.isVariableDeclaration(out[0]) ||
          out[0].declarations.length !== path.node.declarations.length
        ) {
          path.replaceWithMultiple(out);
        }
      },

      // Rewrite member access: foo.bar -> foo.value.bar if foo is tracked
      MemberExpression(path) {
        const obj = path.get('object');
        if (!obj.isIdentifier()) return;

        // If this MemberExpression is already of the form <id>.value, skip to avoid cascading rewrites
        if (
          path.node.property &&
          !path.node.computed &&
          t.isIdentifier(path.node.property, { name: 'value' })
        ) {
          return;
        }

        const prog = path.findParent((p) => p.isProgram());
        const tracked = prog.getData('deferTracked');
        if (!tracked || !tracked.has(obj.node.name)) return;

        // Replace object with foo.value
        obj.replaceWith(t.memberExpression(t.identifier(obj.node.name), t.identifier('value')));
      },

      // Handle top-level assignments like: ({a} = require('pkg'));
      ExpressionStatement(path) {
        if (!path.parentPath.isProgram()) return;

        const enabled = path.findParent((p) => p.isProgram()).getData('enabled');

        if (!enabled) return;

        const expr = path.node.expression;

        if (!t.isAssignmentExpression(expr)) return;

        // ({ a } = require('pkg'));
        if (t.isObjectPattern(expr.left) && isRequireCall(expr.right)) {
          ensureHelper(path);

          const prog = path.findParent((p) => p.isProgram());
          const tracked = prog.getData('deferTracked') || new Set();

          prog.setData('deferTracked', tracked);

          for (const prop of expr.left.properties) {
            if (t.isObjectProperty(prop)) {
              const id = prop.value;
              if (t.isIdentifier(id)) tracked.add(id.name);
            } else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
              tracked.add(prop.argument.name);
            }
          }

          const call = t.callExpression(t.identifier('deferRequire'), [expr.right.arguments[0]]);
          const assign = t.expressionStatement(
            t.assignmentExpression(expr.operator, expr.left, call)
          );

          path.replaceWithMultiple([assign]);
        }
      },
    },
  };
};
