/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.ImportDeclaration} ImportDeclaration */

const ERROR_MSG =
  'Using a trailing slash in package import statements causes issues with webpack and is inconsistent with the rest of the repository.';

/** @type {Rule} */
module.exports = {
  meta: {
    fixable: 'code',
    schema: [],
  },
  create: (context) => ({
    ImportDeclaration(_) {
      const node = /** @type {ImportDeclaration} */ (_);
      const req = node.source.value;

      if (!req.startsWith('.') && req.endsWith('/')) {
        context.report({
          message: ERROR_MSG,
          loc: node.source.loc,
          fix(fixer) {
            return fixer.replaceText(node.source, `'${req.slice(0, -1)}'`);
          },
        });
      }
    },
  }),
};
