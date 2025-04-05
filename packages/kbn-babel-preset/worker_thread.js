/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = function ({ types: t }) {
  return {
    visitor: {
      // Visit call expressions and check if they are dynamic imports
      CallExpression(path) {
        // Check if the callee is an Import (i.e. dynamic import)
        if (!t.isImport(path.node.callee)) return;

        // Ensure there is exactly one argument
        const args = path.get('arguments');
        if (args.length !== 1) return;

        const arg = args[0];
        // Only process if the argument is a string literal
        if (!t.isStringLiteral(arg.node)) return;
        const filename = arg.node.value;

        console.log(filename);

        // If the filename does not end with '_worker', do nothing
        if (!filename.endsWith('.worker')) return;

        // Build the new expression:
        // require('path').join(__dirname, filename)
        const newExpression = t.callExpression(
          t.memberExpression(
            t.callExpression(t.identifier('require'), [t.stringLiteral('path')]),
            t.identifier('join')
          ),
          [t.identifier('__dirname'), t.stringLiteral(filename)]
        );

        // Replace the dynamic import with the new expression
        path.replaceWith(newExpression);
      },
    },
  };
};
