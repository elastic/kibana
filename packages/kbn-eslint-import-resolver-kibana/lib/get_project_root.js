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

const { dirname, resolve, parse } = require('path');
const { accessSync, readFileSync } = require('fs');

const { debug } = require('./debug');

function getConfig(config) {
  const defaults = {
    projectRoot: true,
  };

  if (!config || !config['@elastic/eslint-import-resolver-kibana']) return defaults;
  return Object.assign(defaults, config['@elastic/eslint-import-resolver-kibana']);
}

function getRootPackageDir(dirRoot, dir, rootPackageName) {
  if (dirRoot === dir) return null;
  const pkgFile = resolve(dir, 'package.json');

  try {
    accessSync(pkgFile);

    // if rootPackageName is not provided, stop when package.json is found
    if (!rootPackageName) return dir;

    // if rootPackageName is provided, check for match
    const { name, config } = JSON.parse(readFileSync(pkgFile));
    const { projectRoot } = getConfig(config);

    if (projectRoot && name === rootPackageName) return dir;

    // recurse until a matching package.json is found
    return getRootPackageDir(dirRoot, dirname(dir), rootPackageName);
  } catch (e) {
    if (e.code === 'ENOENT') return getRootPackageDir(dirRoot, dirname(dir), rootPackageName);
    throw e;
  }
}

exports.getProjectRoot = function (file, config) {
  const { root, dir } = parse(resolve(file));
  const { rootPackageName } = config;

  const projectRoot = getRootPackageDir(root, dir, rootPackageName);
  if (projectRoot === null) throw new Error('Failed to find plugin root');

  debug(`Resolved project root: ${projectRoot}`);
  return projectRoot;
};
