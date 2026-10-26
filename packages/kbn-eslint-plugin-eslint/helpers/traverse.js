/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const SKIP = Symbol('skip');
const STOP = Symbol('stop');

/**
 * Breadth-first walk of `node`; the visitor can return SKIP (don't descend) or STOP (end the walk).
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node} node
 * @param {(path: { node: import('estree').Node }) => typeof SKIP | typeof STOP | void} visitor
 */
function traverse(context, node, visitor) {
  const { visitorKeys } = context.sourceCode ?? context.getSourceCode();
  const queue = [node];

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    const result = visitor({ node: current });
    if (result === STOP) return;
    if (result === SKIP) continue;

    for (const key of visitorKeys[current.type] ?? []) {
      const child = current[key];
      if (Array.isArray(child)) {
        queue.push(...child.filter(Boolean));
      } else if (child) {
        queue.push(child);
      }
    }
  }
}

module.exports = traverse;
module.exports.SKIP = SKIP;
module.exports.STOP = STOP;
