/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: we should be able to remove this ts-ignore while using isolatedModules
// this is a skip for the errors created when typechecking with isolatedModules
// @ts-ignore
module.exports = function ({
  entries,
}: {
  entries: Array<{ importId: string; requirePath: string }>;
}) {
  const lines = entries.map(({ importId, requirePath }) => [
    `__kbnBundles__.define('${importId}', __webpack_require__, require.resolve('${requirePath}'))`,
  ]);

  return {
    code: lines.join('\n'),
  };
};
