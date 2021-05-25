/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const path = require('path');
const del = require('del');
const supportsColor = require('supports-color');
const { run } = require('@kbn/dev-utils');

const TARGET_BUILD_DIR = path.resolve(__dirname, '../target');
const ROOT_DIR = path.resolve(__dirname, '../');
const WEBPACK_CONFIG_PATH = path.resolve(ROOT_DIR, 'webpack.config.js');

run(
  async ({ procRunner, log, flags }) => {
    log.info('Deleting old output');

    await del(TARGET_BUILD_DIR);

    const cwd = ROOT_DIR;
    const env = { ...process.env };
    if (supportsColor.stdout) {
      env.FORCE_COLOR = 'true';
    }

    await procRunner.run('worker', {
      cmd: 'webpack',
      args: ['--config', WEBPACK_CONFIG_PATH, flags.dev ? '--env.dev' : '--env.prod'],
      wait: true,
      env,
      cwd,
    });

    await procRunner.run('tsc   ', {
      cmd: 'tsc',
      args: [],
      wait: true,
      env,
      cwd,
    });

    log.success('Complete');
  },
  {
    flags: {
      boolean: ['dev'],
    },
  }
);
