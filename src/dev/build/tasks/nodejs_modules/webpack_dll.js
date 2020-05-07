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

import { deleteAll, isFileAccessible, read, write } from '../../lib';
import { dirname, relative, resolve } from 'path';
import pkgUp from 'pkg-up';
import globby from 'globby';
import normalizePosixPath from 'normalize-path';

function checkDllEntryAccess(entry, baseDir = '') {
  const resolvedPath = baseDir ? resolve(baseDir, entry) : entry;
  return isFileAccessible(resolvedPath);
}

export async function getDllEntries(manifestPaths, whiteListedModules, baseDir = '') {
  // Read and parse all manifests
  const manifests = await Promise.all(
    manifestPaths.map(async manifestPath => JSON.parse(await read(manifestPath)))
  );

  // Process and group modules from all manifests
  const manifestsModules = manifests.flatMap((manifest, idx) => {
    if (!manifest || !manifest.content) {
      // It should fails because if we don't have the manifest file
      // or it is malformed something wrong is happening and we
      // should stop
      throw new Error(`The following dll manifest doesn't exists: ${manifestPaths[idx]}`);
    }

    const modules = Object.keys(manifest.content);
    if (!modules.length) {
      // It should fails because if we don't have any
      // module inside the client vendors dll something
      // wrong is happening and we should stop too
      throw new Error(
        `The following dll manifest is reporting an empty dll: ${manifestPaths[idx]}`
      );
    }

    return modules;
  });

  // Only includes modules who are not in the white list of modules
  // and that are node_modules
  return manifestsModules.filter(entry => {
    const isWhiteListed = whiteListedModules.some(nonEntry =>
      normalizePosixPath(entry).includes(`node_modules/${nonEntry}`)
    );
    const isNodeModule = entry.includes('node_modules');

    // NOTE: when using dynamic imports on webpack the entry paths could be created
    // with special context module (ex: lazy recursive) values over directories that are not real files
    // and only exists in runtime, so we need to check if the entry is a real file.
    // We found that problem through the issue https://github.com/elastic/kibana/issues/38481
    //
    // More info:
    // https://github.com/webpack/webpack/blob/master/examples/code-splitting-harmony/README.md
    // https://webpack.js.org/guides/dependency-management/#require-with-expression
    const isAccessible = checkDllEntryAccess(entry, baseDir);

    return !isWhiteListed && isNodeModule && isAccessible;
  });
}

export async function cleanDllModuleFromEntryPath(logger, entryPath) {
  const modulePkgPath = await pkgUp(entryPath);
  const modulePkg = JSON.parse(await read(modulePkgPath));
  const moduleDir = dirname(modulePkgPath);
  const normalizedModuleDir = normalizePosixPath(moduleDir);

  // Cancel the cleanup for this module as it
  // was already done.
  if (modulePkg.cleaned) {
    return;
  }

  // Clear dependencies from dll module package.json
  if (modulePkg.dependencies) {
    modulePkg.dependencies = {};
  }

  // Clear devDependencies from dll module package.json
  if (modulePkg.devDependencies) {
    modulePkg.devDependencies = {};
  }

  // Delete module contents. It will delete everything
  // excepts package.json, images and css
  //
  // NOTE: We can't use cwd option with globby
  // until the following issue gets closed
  // https://github.com/sindresorhus/globby/issues/87
  const filesToDelete = await globby([
    `${normalizedModuleDir}/**`,
    `!${normalizedModuleDir}/**/*.+(css)`,
    `!${normalizedModuleDir}/**/*.+(gif|ico|jpeg|jpg|tiff|tif|svg|png|webp)`,
  ]);

  await deleteAll(
    filesToDelete.filter(path => {
      const relativePath = relative(moduleDir, path);
      return !relativePath.endsWith('package.json') || relativePath.includes('node_modules');
    })
  );

  // Mark this module as cleaned
  modulePkg.cleaned = true;

  // Rewrite modified package.json
  await write(modulePkgPath, JSON.stringify(modulePkg, null, 2));
}

export async function writeEmptyFileForDllEntry(entryPath) {
  await write(entryPath, '');
}
