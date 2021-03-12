/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

(function () {
  var cp = require('child_process');

  var preserveSymlinksOption = '--preserve-symlinks';
  var preserveSymlinksMainOption = '--preserve-symlinks-main';
  var nodeOptions = (process && process.env && process.env.NODE_OPTIONS) || [];
  var nodeExecArgv = (process && process.execArgv) || [];

  var isPreserveSymlinksPresent =
    nodeOptions.includes(preserveSymlinksOption) || nodeExecArgv.includes(preserveSymlinksOption);
  var isPreserveSymlinksMainPresent =
    nodeOptions.includes(preserveSymlinksMainOption) ||
    nodeExecArgv.includes(preserveSymlinksMainOption);

  if (isPreserveSymlinksPresent && isPreserveSymlinksMainPresent) {
    return;
  }

  var nodeArgv = (process && process.argv) || [];
  var isFirstArgNode = nodeArgv.length > 0 && nodeArgv[0].includes('node') ? nodeArgv[0] : null;
  if (!isFirstArgNode) {
    return;
  }

  var missingNodeArgs = [];
  if (!isPreserveSymlinksMainPresent) {
    missingNodeArgs.push(preserveSymlinksMainOption);
  }

  if (!isPreserveSymlinksPresent) {
    missingNodeArgs.push(preserveSymlinksOption);
  }

  var nodeArgs = nodeExecArgv.concat(missingNodeArgs);
  var restArgs = nodeArgv.length >= 2 ? nodeArgv.slice(1, nodeArgv.length) : [];

  var getExitCodeFromSpawnResult = function (spawnResult) {
    if (spawnResult.status !== null) {
      return spawnResult.status;
    }

    if (spawnResult.signal !== null) {
      return 128 + spawnResult.signal;
    }

    if (spawnResult.error) {
      return 1;
    }

    return 0;
  };

  var spawnResult = cp.spawnSync(nodeArgv[0], nodeArgs.concat(restArgs), { stdio: 'inherit' });
  process.exit(getExitCodeFromSpawnResult(spawnResult));
})();
