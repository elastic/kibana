/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
