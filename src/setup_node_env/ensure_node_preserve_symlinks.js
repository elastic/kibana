/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

(function () {
  var cp = require('child_process');

  var calculateInspectPortOnExecArgv = function (processExecArgv) {
    var execArgv = [].concat(processExecArgv);

    if (execArgv.length === 0) {
      return execArgv;
    }

    var inspectFlagIndex = execArgv.reverse().findIndex(function (flag) {
      return flag.startsWith('--inspect');
    });

    if (inspectFlagIndex !== -1) {
      var inspectFlag;
      var inspectPortCounter = 9230;
      var argv = execArgv[inspectFlagIndex];

      if (argv.includes('=')) {
        // --inspect=port
        var argvSplit = argv.split('=');
        var flag = argvSplit[0];
        var port = argvSplit[1];
        inspectFlag = flag;
        inspectPortCounter = Number.parseInt(port, 10) + 1;
      } else {
        // --inspect
        inspectFlag = argv;

        // is number?
        if (String(execArgv[inspectFlagIndex + 1]).match(/^[0-9]+$/)) {
          // --inspect port
          inspectPortCounter = Number.parseInt(execArgv[inspectFlagIndex + 1], 10) + 1;
          execArgv.slice(inspectFlagIndex + 1, 1);
        }
      }

      execArgv[inspectFlagIndex] = inspectFlag + '=' + inspectPortCounter;
    }

    return execArgv;
  };

  var preserveSymlinksOption = '--preserve-symlinks';
  var preserveSymlinksMainOption = '--preserve-symlinks-main';
  var nodeOptions = (process && process.env && process.env.NODE_OPTIONS) || [];
  var nodeExecArgv = calculateInspectPortOnExecArgv((process && process.execArgv) || []);

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

  // Since we are using `stdio: inherit`, the child process will receive
  // the `SIGINT` and `SIGTERM` from the terminal.
  // However, we want the parent process not to exit until the child does.
  // Adding the following handlers achieves that.
  process.on('SIGINT', function () {});
  process.on('SIGTERM', function () {});

  var spawnResult = cp.spawnSync(nodeArgv[0], nodeArgs.concat(restArgs), { stdio: 'inherit' });
  process.exit(getExitCodeFromSpawnResult(spawnResult));
})();
