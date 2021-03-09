/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

(() => {
  const execa = require('execa');

  const preserveSymlinksOption = '--preserve-symlinks';
  if (
    process?.env?.NODE_OPTIONS?.includes(preserveSymlinksOption) ||
    process?.execArgv.includes(preserveSymlinksOption)
  ) {
    return;
  }

  const isFirstArgNode =
    process?.argv.length > 0 && process.argv[0].includes('node') ? process.argv[0] : null;
  if (!isFirstArgNode) {
    return;
  }

  const nodeArgs = process.execArgv
    ? [preserveSymlinksOption, ...process.execArgv]
    : [preserveSymlinksOption];
  const restArgs = process.argv.length >= 2 ? process.argv.slice(1, process.argv.length) : [];

  execa.sync(process.argv[0], [...nodeArgs, ...restArgs], { stdio: 'inherit' });
  process.exit(0);
})();
