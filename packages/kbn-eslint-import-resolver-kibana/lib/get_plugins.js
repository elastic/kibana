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

const { dirname, resolve } = require('path');

const glob = require('glob-all');

exports.getPlugins = function(config, kibanaPath, projectRoot) {
  const resolveToRoot = path => resolve(projectRoot, path);

  const pluginDirs = [
    ...(config.pluginDirs || []).map(resolveToRoot),
    resolve(kibanaPath, 'plugins'),
    resolve(kibanaPath, 'src/legacy/core_plugins'),
  ];

  const pluginPaths = [
    ...(config.pluginPaths || []).map(resolveToRoot),

    // when the rootPackageName is specified we assume that the root of the project
    // is not a plugin, so don't include it automatically
    ...(config.rootPackageName ? [] : [projectRoot]),
  ];

  const globPatterns = [
    ...pluginDirs.map(dir => resolve(dir, '*/package.json')),
    ...pluginPaths.map(path => resolve(path, 'package.json')),
  ];

  const pluginsFromMap = Object.keys(config.pluginMap || {}).map(name => {
    const directory = resolveToRoot(config.pluginMap[name]);
    return {
      name,
      directory,
      publicDirectory: resolve(directory, 'public'),
    };
  });

  return pluginsFromMap.concat(
    glob.sync(globPatterns).map(pkgJsonPath => {
      const path = dirname(pkgJsonPath);
      const pkg = require(pkgJsonPath); // eslint-disable-line import/no-dynamic-require
      return {
        name: pkg.name,
        directory: path,
        publicDirectory: resolve(path, 'public'),
      };
    })
  );
};
