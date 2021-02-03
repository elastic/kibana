/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const { resolve } = require('path');

const del = require('del');
const { run, withProcRunner } = require('@kbn/dev-utils');

const ROOT_DIR = resolve(__dirname, '..');
const BUILD_DIR = resolve(ROOT_DIR, 'target');

run(
  async ({ log, flags }) => {
    await withProcRunner(log, async (proc) => {
      log.info('Deleting old output');
      await del(BUILD_DIR);

      const cwd = ROOT_DIR;

      log.info(`Starting babel${flags.watch ? ' in watch mode' : ''}`);
      await proc.run(`babel`, {
        cmd: 'babel',
        args: [
          'src',
          '--no-babelrc',
          '--presets',
          require.resolve('@kbn/babel-preset/node_preset'),
          '--extensions',
          '.ts,.js',
          '--copy-files',
          '--out-dir',
          BUILD_DIR,
          ...(flags.watch ? ['--watch'] : ['--quiet']),
          ...(!flags['source-maps'] || !!process.env.CODE_COVERAGE
            ? []
            : ['--source-maps', 'inline']),
        ],
        wait: true,
        cwd,
      });

      log.success('Complete');
    });
  },
  {
    description: 'Simple build tool for @kbn/es package',
    flags: {
      boolean: ['watch', 'source-maps'],
      help: `
        --watch            Run in watch mode
        --source-maps      Include sourcemaps
      `,
    },
  }
);
