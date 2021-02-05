/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { relative } = require('path');

const getopts = require('getopts');
const del = require('del');
const supportsColor = require('supports-color');
const { ToolingLog, withProcRunner, pickLevelFromFlags } = require('@kbn/dev-utils');

const { ROOT_DIR, BUILD_DIR } = require('./paths');

const unknownFlags = [];
const flags = getopts(process.argv, {
  boolean: ['watch', 'dev', 'help', 'debug'],
  unknown(name) {
    unknownFlags.push(name);
  },
});

const log = new ToolingLog({
  level: pickLevelFromFlags(flags),
  writeTo: process.stdout,
});

if (unknownFlags.length) {
  log.error(`Unknown flag(s): ${unknownFlags.join(', ')}`);
  flags.help = true;
  process.exitCode = 1;
}

if (flags.help) {
  log.info(`
    Simple build tool for @kbn/interpreter package

    --dev      Build for development, include source maps
    --watch    Run in watch mode
    --debug    Turn on debug logging
  `);
  process.exit();
}

withProcRunner(log, async (proc) => {
  log.info('Deleting old output');
  await del(BUILD_DIR);

  const cwd = ROOT_DIR;
  const env = { ...process.env };
  if (supportsColor.stdout) {
    env.FORCE_COLOR = 'true';
  }

  log.info(`Starting babel ${flags.watch ? ' in watch mode' : ''}`);
  await Promise.all([
    proc.run('babel  ', {
      cmd: 'babel',
      args: [
        'src',
        '--ignore',
        `*.test.js`,
        '--out-dir',
        relative(cwd, BUILD_DIR),
        '--copy-files',
        ...(flags.dev ? ['--source-maps', 'inline'] : []),
        ...(flags.watch ? ['--watch'] : ['--quiet']),
      ],
      wait: true,
      env,
      cwd,
    }),
  ]);

  log.success('Complete');
}).catch((error) => {
  log.error(error);
  process.exit(1);
});
