/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Reusable keep directive regex (@kbn/lazy-require: keep)
const KEEP_RE = /(@kbn\/lazy-require)\s*:??\s*keep/i;

/**
 * @param {babel.types} t
 * @param {babel.NodePath<babel.types.Program>} program
 * @returns {Array<{specifier:string; id:string }>}
 * */
exports.getModulesToKeep = (t, program) => {
  /**
   *
   * @param {babel.types.Statement} statement
   */
  function hasKeepDirective(statement) {
    const leadingCommentWithDirective = statement.leadingComments?.find((comment) => {
      return KEEP_RE.test(comment.value);
    });

    if (leadingCommentWithDirective) {
      return true;
    }

    const trailingCommentWithDirective = statement.trailingComments?.find((comment) => {
      return KEEP_RE.test(comment.value) && comment.loc.start.line === statement.loc.start.line;
    });

    if (trailingCommentWithDirective) {
      return true;
    }

    return false;
  }

  const body = program.get('body');

  /**
   * @type {string[]}
   */
  const toKeep = [];

  for (const stmt of body) {
    const node = stmt.node;
    if (!t.isImportDeclaration(node)) {
      continue;
    }

    if (!hasKeepDirective(node)) {
      continue;
    }

    toKeep.push(node.source.value);
  }

  return toKeep;
};
