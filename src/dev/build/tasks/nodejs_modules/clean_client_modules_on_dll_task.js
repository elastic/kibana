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

import { getDllEntries, cleanDllModuleFromEntryPath, writeEmptyFileForDllEntry } from './webpack_dll';
import { getDependencies } from './get_dependencies';
import globby from 'globby';
import normalizePosixPath from 'normalize-path';

export const CleanClientModulesOnDLLTask = {
  description:
    'Cleaning client node_modules bundled into the DLL',

  async run(config, log, build) {
    const baseDir = normalizePosixPath(build.resolvePath('.'));
    const kbnPkg = config.getKibanaPkg();
    const kbnPkgDependencies = (kbnPkg && kbnPkg.dependencies) || {};
    const kbnWebpackLoaders = Object.keys(kbnPkgDependencies).filter(dep => !!dep.includes('-loader'));

    // Define the entry points for the server code in order to
    // start here later looking for the server side dependencies
    const mainCodeEntries = [
      `${baseDir}/src/cli`,
      `${baseDir}/src/cli_keystore`,
      `${baseDir}/src/cli_plugin`,
      `${baseDir}/x-pack`,
      ...kbnWebpackLoaders.map(loader => `${baseDir}/node_modules/${loader}`)
    ];
    const discoveredLegacyCorePluginEntries = await globby([
      `${baseDir}/src/legacy/core_plugins/*/index.js`,
      `!${baseDir}/src/legacy/core_plugins/**/public`
    ]);
    const discoveredPluginEntries = await globby([
      `${baseDir}/src/plugins/*/server/index.js`,
      `!${baseDir}/src/plugins/**/public`
    ]);

    // Compose all the needed entries
    const serverEntries = [ ...mainCodeEntries, ...discoveredLegacyCorePluginEntries, ...discoveredPluginEntries];

    // Get the dependencies found searching through the server
    // side code entries that were provided
    const serverDependencies = await getDependencies(baseDir, serverEntries);

    // Consider this as our whiteList for the modules we can't delete
    const whiteListedModules = [
      ...serverDependencies,
      ...kbnWebpackLoaders
    ];

    // Resolve the client vendors dll manifest path
    const dllManifestPath = `${baseDir}/built_assets/dlls/vendors.manifest.dll.json`;

    // Get dll entries filtering out the ones
    // from any whitelisted module
    const dllEntries = await getDllEntries(dllManifestPath, whiteListedModules);

    for (const relativeEntryPath of dllEntries) {
      const entryPath = `${baseDir}/${relativeEntryPath}`;

      // Clean a module included into the dll
      // and then write a blank file for each
      // entry file present into the dll
      await cleanDllModuleFromEntryPath(log, entryPath);
      await writeEmptyFileForDllEntry(entryPath);
    }
  }
};
