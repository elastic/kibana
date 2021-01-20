/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const path = require('path');
const del = require('del');
const fs = require('fs');
const supportsColor = require('supports-color');
const { run } = require('@kbn/dev-utils');

const TARGET_BUILD_DIR = path.resolve(__dirname, '../target');
const ROOT_DIR = path.resolve(__dirname, '../');
const WORKER_PATH_SECTION = 'ace/modes/x_json/worker/x_json.ace.worker.js';

run(
  async ({ procRunner, log }) => {
    log.info('Deleting old output');

    await del(TARGET_BUILD_DIR);

    const cwd = ROOT_DIR;
    const env = { ...process.env };

    if (supportsColor.stdout) {
      env.FORCE_COLOR = 'true';
    }

    await procRunner.run('tsc   ', {
      cmd: 'tsc',
      args: [],
      wait: true,
      env,
      cwd,
    });

    log.success('Copying worker file to target.');

    fs.copyFileSync(
      path.resolve(__dirname, '..', 'src', WORKER_PATH_SECTION),
      path.resolve(__dirname, '..', 'target', WORKER_PATH_SECTION)
    );

    log.success('Complete');
  },
  {
    flags: {
      boolean: ['dev'],
    },
  }
);
