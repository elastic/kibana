/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

var execFileSync = require('child_process').execFileSync;
var path = require('path');
var syncGlob = require('glob').sync;
var program = require('commander');

program
  .name('node scripts/test_hardening.js')
  .arguments('[file...]')
  .description(
    'Run the tests in test/harden directory. If no files are provided, all files within the directory will be run.'
  )
  .action(function (globs) {
    if (globs.length === 0) globs.push(path.join('test', 'harden', '*'));
    globs.forEach(function (glob) {
      syncGlob(glob).forEach(function (filename) {
        if (path.basename(filename)[0] === '_') return;
        console.log(process.argv[0], filename);
        execFileSync(process.argv[0], [filename], { stdio: 'inherit' });
      });
    });
  })
  .parse(process.argv);
