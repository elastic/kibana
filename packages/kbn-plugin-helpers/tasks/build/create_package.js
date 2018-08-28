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

const join = require('path').join;
const relative = require('path').relative;
const del = require('del');
const vfs = require('vinyl-fs');
const zip = require('gulp-zip');

module.exports = function createPackage(plugin, buildTarget, buildVersion) {
  const buildId = `${plugin.id}-${buildVersion}`;
  const buildRoot = join(buildTarget, 'kibana', plugin.id);

  // zip up the package
  return new Promise(function(resolve, reject) {
    const buildFiles = [relative(buildTarget, buildRoot) + '/**/*'];

    vfs
      .src(buildFiles, { cwd: buildTarget, base: buildTarget })
      .pipe(zip(`${buildId}.zip`))
      .pipe(vfs.dest(buildTarget))
      .on('end', resolve)
      .on('error', reject);
  }).then(function() {
    // clean up the build path
    return del(join(buildTarget, 'kibana'));
  });
};
