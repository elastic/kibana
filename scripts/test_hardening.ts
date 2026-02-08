/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const execFileSync = require('child_process').execFileSync;
const path = require('path');
const syncGlob = require('glob').sync;
const program = require('commander');

program
  .name('node scripts/test_hardening.ts')
  .arguments('[file...]')
  .description(
    'Run the tests in test/harden directory. If no files are provided, all files within the directory will be run.'
  )
  .action(function (globs: string[]) {
    if (globs.length === 0) globs.push(path.join('test', 'harden', '*'));
    globs.forEach(function (glob: string) {
      syncGlob(glob).forEach(function (filename: string) {
        if (path.basename(filename)[0] === '_') return;
        console.log(process.argv[0], filename);
        execFileSync(process.argv[0], [filename], { stdio: 'inherit' });
      });
    });
  })
  .parse(process.argv);
