/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @param {babel.NodePath<babel.types.Program>} program
 */
exports.generateCode = (program) => {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const generate = require('@babel/generator').default;
  const { code } = generate(program.hub.file.ast, {
    compact: false,
    comments: true,
    retainLines: false,
  });
  const header = `--- START OF CODE ---`;
  return `\n${header}\n${code}\n--- END OF CODE ---`;
};

/**
 * @param {babel.NodePath<babel.types.Node>} node
 */
exports.generateCodeForNode = (node) => {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const generate = require('@babel/generator').default;
  const { code } = generate(node, {
    compact: false,
    comments: true,
    retainLines: false,
  });

  return code;
};
