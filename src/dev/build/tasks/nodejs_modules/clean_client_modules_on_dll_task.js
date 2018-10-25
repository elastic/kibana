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

export const CleanClientModulesOnDLLTask = {
  description:
    'Cleaning client node_modules bundled into the DLL',

  async run(config, log, build) {
    const baseDir = build.resolvePath('.');
    const kbnPkg = config.getKibanaPkg();
    const kbnPkgDependencies = (kbnPkg && kbnPkg.dependencies) || {};
    const kbnWebpackLoaders = Object.keys(kbnPkgDependencies).filter(dep => !!dep.includes('-loader'));
    const mainCodeEntries = [
      build.resolvePath('src/cli'),
      build.resolvePath('src/cli_keystore'),
      build.resolvePath('src/cli_plugin'),
      build.resolvePath('node_modules/x-pack'),
      ...kbnWebpackLoaders.map(loader => build.resolvePath(`node_modules/${loader}`))
    ];
    const discoveredPluginEntries = await globby([
      `${baseDir}/src/core_plugins/*/index.js`,
      `!${baseDir}/src/core_plugins/**/public`
    ]);

    // Compose all the needed entries
    const serverEntries = [ ...mainCodeEntries, ...discoveredPluginEntries];

    // Get the dependencies found searching through the server
    // side code entries that were provided
    const serverDependencies = await getDependencies(config.resolveFromRepo(), serverEntries);

    // Consider this as our whiteList for the modules we can't delete
    const whiteListedModules = [
      ...serverDependencies,
      ...kbnWebpackLoaders
    ];

    // Resolve the client vendors dll manifest path
    const dllManifestPath = build.resolvePath('dlls/vendors.manifest.dll.json');

    // Get dll entries filtering out the ones
    // from any whitelisted module
    const dllEntries = await getDllEntries(dllManifestPath, whiteListedModules);

    for (const relativeEntryPath of dllEntries) {
      const entryPath = build.resolvePath(relativeEntryPath);

      // Clean a module included into the dll
      // and then write a blank file for each
      // entry file present into the dll
      await cleanDllModuleFromEntryPath(log, entryPath);
      await writeEmptyFileForDllEntry(entryPath);
    }
  }
};
