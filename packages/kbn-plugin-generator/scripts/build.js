/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const Path = require('path');

const { run } = require('@kbn/dev-utils');
const del = require('del');
const execa = require('execa');

run(
  async ({ flags }) => {
    await del(Path.resolve(__dirname, '../target'));

    await execa(require.resolve('typescript/bin/tsc'), flags.watch ? ['--watch'] : [], {
      cwd: Path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
  },
  {
    flags: {
      boolean: ['watch'],
      help: `
        --watch           Watch files and rebuild on changes
      `,
    },
  }
);
