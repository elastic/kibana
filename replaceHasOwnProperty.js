/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = function (fileInfo, api) {
  const j = api.jscodeshift;

  return j(fileInfo.source)
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: {
          type: 'Identifier',
          name: 'hasOwnProperty',
        },
      },
    })
    .replaceWith((path) => {
      const node = path.node;
      const obj = node.callee.object;
      const args = node.arguments;

      return j.callExpression(j.memberExpression(j.identifier('Object'), j.identifier('hasOwn')), [
        obj,
        ...args,
      ]);
    })
    .toSource();
};
