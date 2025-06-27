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
  // Babel runs this plugin for every file that it processes. If the current
  // file has the `.text` extension we create a fresh AST that simply exports
  // the raw file contents (`code`) via `module.exports = "..."`. For all other
  // files we fall back to Babel's normal parser.
  return {
    name: 'text-to-cjs',

    /**
     * Override Babel's parser only for `.text` files.
     *
     * @param {string} code  The entire contents of the file that Babel is
     *                       processing (for .text files this is arbitrary
     *                       plain-text, not valid JS).
     * @param {object} opts  Parser options – we only care about `opts.filename`.
     * @param {Function} parse  The default Babel parse function.
     */
    parserOverride(code, opts, parse) {
      const filename = opts.sourceFileName || '';

      if (filename.endsWith('.text')) {
        // Build: module.exports = "<raw contents>";
        const program = t.program([
          t.expressionStatement(
            t.assignmentExpression(
              '=',
              t.memberExpression(t.identifier('module'), t.identifier('exports')),
              t.stringLiteral(code)
            )
          ),
        ]);

        // Babel expects a `File` node.
        return t.file(program, [], []);
      }

      // For non-.text files fall back to default behaviour.
      return parse(code, opts);
    },
  };
};
