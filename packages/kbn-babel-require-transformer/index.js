/* Rewrites top-level require() to ESM imports for backend files only.
   Skips absolute paths, .ts/.tsx specifiers, and setup_node_env/polyfills.
   Adds .js to relative specifiers to satisfy ESM resolution when needed. */
module.exports = function rewriteRequireToImport({ types: t }) {
  function isRequireCall(node) {
    return (
      t.isCallExpression(node) &&
      t.isIdentifier(node.callee, { name: 'require' }) &&
      node.arguments.length === 1 &&
      t.isStringLiteral(node.arguments[0])
    );
  }

  // Skip: absolute paths, explicit TS files, and setup_node_env targets
  const SKIP_SPEC = /^(\/|[A-Za-z]:[\\/])|\.tsx?$|(?:^|[\\/])setup_node_env(?:[\\/]|$)/;

  function shouldTransformFile(state) {
    const f = state.file?.opts?.filename || '';
    // Backend sources only; avoid early boot and public/browser code.
    if (!f) return false;
    if (f.includes('/src/setup_node_env/')) return false;
    if (f.includes('/scripts/')) return false;
    if (f.includes('/public/')) return false;
    // Apply to typical server-side code locations
    return f.includes('/src/') || f.includes('/x-pack/') || f.includes('/packages/');
  }

  function addJsExtIfRelative(lit) {
    const v = lit.value;
    if ((v.startsWith('./') || v.startsWith('../')) && !/\.(m?js|cjs|json|node)$/.test(v)) {
      return t.stringLiteral(v + '.js');
    }
    return lit;
  }

  function shouldRewriteLiteral(lit) {
    return !SKIP_SPEC.test(lit.value);
  }

  return {
    name: 'rewrite-require-to-import',
    visitor: {
      Program(path, state) {
        path.setData('enabled', shouldTransformFile(state));
      },

      // require('pkg'); at top-level -> import 'pkg';
      ExpressionStatement(path) {
        if (!path.parentPath.isProgram()) return;
        const enabled = path.findParent((p) => p.isProgram()).getData('enabled');
        if (!enabled) return;

        const expr = path.node.expression;
        if (!isRequireCall(expr)) return;

        const lit = expr.arguments[0];
        if (!shouldRewriteLiteral(lit)) return;

        path.replaceWith(t.importDeclaration([], addJsExtIfRelative(lit)));
      },

      // const x = require('pkg');  const {a} = require('pkg');
      VariableDeclaration(path) {
        if (!path.parentPath.isProgram()) return;
        const enabled = path.findParent((p) => p.isProgram()).getData('enabled');
        if (!enabled) return;

        const newImports = [];
        const keep = [];

        for (const decl of path.node.declarations) {
          const init = decl.init;
          if (!isRequireCall(init)) {
            keep.push(decl);
            continue;
          }

          const lit = init.arguments[0];
          if (!shouldRewriteLiteral(lit)) {
            keep.push(decl); // keep original require()
            continue;
          }

          const source = addJsExtIfRelative(lit);

          if (t.isIdentifier(decl.id)) {
            newImports.push(t.importDeclaration([t.importDefaultSpecifier(decl.id)], source));
          } else if (t.isObjectPattern(decl.id)) {
            const ns = path.scope.generateUidIdentifier('mod');
            newImports.push(t.importDeclaration([t.importNamespaceSpecifier(ns)], source));
            keep.push(t.variableDeclarator(decl.id, ns));
          } else {
            keep.push(decl);
          }
        }

        if (!newImports.length) return;
        path.replaceWithMultiple(
          keep.length ? [...newImports, t.variableDeclaration(path.node.kind, keep)] : newImports
        );
      },
    },
  };
};
