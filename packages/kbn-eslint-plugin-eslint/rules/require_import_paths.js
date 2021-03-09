/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const path = require('path');
const mm = require('micromatch');
const { REPO_ROOT } = require('@kbn/utils');

function checkModuleNameNode(context, options, node) {
  if (node.value.startsWith('./') || node.value.startsWith('@')) {
    return;
  }

  const filename = path.resolve(REPO_ROOT, context.getFilename());
  const importPath = path.resolve(path.dirname(filename), node.value);

  let packagePath;

  for (let i = 0; i < options.paths.length; i++) {
    const rootPath = options.paths[i];

    const match = mm.capture(`${REPO_ROOT}/(${rootPath})/**`, filename);
    if (match) {
      packagePath = match[0];

      break;
    }
  }

  if (node.value.startsWith('..') && !importPath.startsWith(path.resolve(REPO_ROOT, packagePath))) {
    context.report({
      node: node,
      message: 'Relative imports are not allowed across packages',
      fix(fixer) {
        return fixer.replaceText(node, `'${path.relative(REPO_ROOT, importPath)}'`);
      },
    });
  } else if (node.value.startsWith(packagePath)) {
    context.report({
      node: node,
      message: 'Relative imports required within a package',
      fix(fixer) {
        return fixer.replaceText(node, `'${path.relative(path.dirname(filename), node.value)}'`);
      },
    });
  }
}

module.exports = {
  meta: {
    type: 'problem',
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          paths: { anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
        },
      },
    ],
  },
  create: (context) => {
    const options = context.options[0];

    return {
      ImportDeclaration(node) {
        checkModuleNameNode(context, options, node.source);
      },
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal'
        ) {
          checkModuleNameNode(context, options, node.arguments[0]);
        }
      },
    };
  },
};
