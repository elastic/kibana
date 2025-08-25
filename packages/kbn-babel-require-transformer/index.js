/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* Convert top-level CommonJS require() patterns into "inlined" CommonJS requires.
 * Examples:
 *   const { a, b } = require('pkg');
 *     -> const _pkg = require('pkg'); const { a, b } = _pkg;
 *   const x = require('pkg').x;
 *     -> const _pkg = require('pkg'); const x = _pkg.x;
 *   const x = require('pkg'); // unchanged (already inline)
 *   require('pkg');           // unchanged (side-effect)
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

  function createInlineRequire(path, sourceLiteral) {
    const uid = path.scope.generateUidIdentifier(
      sourceLiteral.value.replace(/[^a-zA-Z0-9_$]+/g, '_') || 'mod'
    );
    const requireCall = t.callExpression(t.identifier('require'), [sourceLiteral]);
    const tmpDecl = t.variableDeclaration('const', [t.variableDeclarator(uid, requireCall)]);
    return { uid, tmpDecl };
  }

  function transformDeclarator(path, decl) {
    const init = decl.init;
    if (!init) return null;

    // Pattern 1: const { a } = require('pkg'); OR const [a] = require('pkg');
    if ((t.isObjectPattern(decl.id) || t.isArrayPattern(decl.id)) && isRequireCall(init)) {
      const { uid, tmpDecl } = createInlineRequire(path, init.arguments[0]);
      const newDecl = t.variableDeclarator(decl.id, uid);
      return [tmpDecl, t.variableDeclaration(path.node.kind, [newDecl])];
    }

    // Pattern 2: const x = require('pkg').prop; or const x = require('pkg')[expr]
    if (t.isMemberExpression(init) && isRequireCall(init.object)) {
      const { uid, tmpDecl } = createInlineRequire(path, init.object.arguments[0]);
      const member = t.memberExpression(uid, init.property, init.computed, init.optional);
      const newDecl = t.variableDeclarator(decl.id, member);
      return [tmpDecl, t.variableDeclaration(path.node.kind, [newDecl])];
    }

    // Pattern 3: const x = require('pkg'); (leave as-is)
    if (isRequireCall(init) && t.isIdentifier(decl.id)) {
      return null;
    }

    return null;
  }

  return {
    name: 'inline-commonjs-require',
    visitor: {
      // Only mutate top-level declarations
      VariableDeclaration(path) {
        if (!path.parentPath.isProgram()) return;

        const replacements = [];
        const keep = [];

        for (const decl of path.node.declarations) {
          const res = transformDeclarator(path, decl);
          if (res) {
            replacements.push(...res);
          } else {
            keep.push(decl);
          }
        }

        if (replacements.length) {
          const out = [...replacements];
          if (keep.length) out.push(t.variableDeclaration(path.node.kind, keep));
          path.replaceWithMultiple(out);
        }
      },

      // Handle top-level assignments like: ({a} = require('pkg'));
      ExpressionStatement(path) {
        if (!path.parentPath.isProgram()) return;
        const expr = path.node.expression;
        if (!t.isAssignmentExpression(expr)) return;

        // ({ a } = require('pkg'));
        if (
          (t.isObjectPattern(expr.left) || t.isArrayPattern(expr.left)) &&
          isRequireCall(expr.right)
        ) {
          const { uid, tmpDecl } = createInlineRequire(path, expr.right.arguments[0]);
          const assign = t.expressionStatement(
            t.assignmentExpression(expr.operator, expr.left, uid)
          );
          path.replaceWithMultiple([tmpDecl, assign]);
        }

        // x = require('pkg').foo;
        if (t.isMemberExpression(expr.right) && isRequireCall(expr.right.object)) {
          const { uid, tmpDecl } = createInlineRequire(path, expr.right.object.arguments[0]);
          const rhs = t.memberExpression(
            uid,
            expr.right.property,
            expr.right.computed,
            expr.right.optional
          );
          const assign = t.expressionStatement(
            t.assignmentExpression(expr.operator, expr.left, rhs)
          );
          path.replaceWithMultiple([tmpDecl, assign]);
        }
      },
    },
  };
};
