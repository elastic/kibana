/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Compiles .text files to CommonJS. This is needed because inlining files
 * breaks some caching assumptions, in that if the .text file changes,
 * it does not invalidate the cache of the file that imports it. Instead,
 * we translate to CommonJS so it can be imported as if it was a JavaScript
 * module.
 */
module.exports = function ({ types: t }) {
  return {
    name: 'text-to-module',
    visitor: {
      Program(path, state) {
        if (!state.filename.endsWith('.text')) return;

        const fs = require('fs');
        const content = fs.readFileSync(state.filename, 'utf8');

        const moduleExports = t.memberExpression(t.identifier('module'), t.identifier('exports'));
        const assign = t.expressionStatement(
          t.assignmentExpression('=', moduleExports, t.stringLiteral(content))
        );

        // Mutate the Program body in-place to prevent recursion
        path.node.body = [assign];
        // Prevent further traversal on this file
        path.stop();
      },
    },
  };
};
