/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

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
