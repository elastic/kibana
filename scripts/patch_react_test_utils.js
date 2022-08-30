/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

var ChildProcess = require('child_process');
var Fs = require('fs');

try {
  ChildProcess.execFileSync(
    'patch',
    ['node_modules/react-dom/cjs/react-dom-test-utils.development.js'],
    {
      input: Fs.readFileSync(require.resolve('./patch_react_test_utils.patch')),
    }
  );
} catch (error) {
  console.log(
    `patch failed: ${error.output
      .map(function (o) {
        return !!o ? o.toString() : '';
      })
      .join('\n\n')}`
  );
}
