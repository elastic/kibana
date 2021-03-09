/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

(function () {
  var execa = require('execa');

  var preserveSymlinksOption = '--preserve-symlinks';
  var nodeOptions = (process && process.env && process.env.NODE_OPTIONS) || [];
  var nodeExecArgv = (process && process.execArgv) || [];
  if (
    nodeOptions.includes(preserveSymlinksOption) ||
    nodeExecArgv.includes(preserveSymlinksOption)
  ) {
    return;
  }

  var nodeArgv = (process && process.argv) || [];
  var isFirstArgNode = nodeArgv.length > 0 && nodeArgv[0].includes('node') ? nodeArgv[0] : null;
  if (!isFirstArgNode) {
    return;
  }

  var nodeArgs =
    nodeExecArgv.length > 0
      ? [preserveSymlinksOption].concat(nodeExecArgv)
      : [preserveSymlinksOption];
  var restArgs = nodeArgv.length >= 2 ? nodeArgv.slice(1, nodeArgv.length) : [];

  try {
    var cmdResult = execa.sync(nodeArgv[0], nodeArgs.concat(restArgs), { stdio: 'inherit' });
    process.exit(cmdResult.exitCode);
  } catch (error) {
    process.exit(error.exitCode);
  }
})();
