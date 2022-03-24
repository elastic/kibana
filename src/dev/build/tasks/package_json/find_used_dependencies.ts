/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import globby from 'globby';
import normalize from 'normalize-path';
// @ts-ignore
import { parseEntries, dependenciesParseStrategy } from '@kbn/babel-code-parser';

async function getDependencies(cwd: string, entries: string[]) {
  // Return the dependencies retrieve from the
  // provided code entries (sanitized) and
  // parseStrategy (dependencies one)
  return Object.keys(await parseEntries(cwd, entries, dependenciesParseStrategy, {}));
}

export async function findUsedDependencies(listedPkgDependencies: any, baseDir: any) {
  // Define the entry points for the server code in order to
  // start here later looking for the server side dependencies
  const mainCodeEntries = await globby(normalize(Path.resolve(baseDir, `src/cli*/dist.js`)));

  const discoveredPluginEntries = await globby([
    normalize(Path.resolve(baseDir, `src/plugins/**/server/index.js`)),
    `!${normalize(Path.resolve(baseDir, `/src/plugins/**/public`))}`,
    normalize(Path.resolve(baseDir, `x-pack/plugins/**/server/index.js`)),
    `!${normalize(Path.resolve(baseDir, `/x-pack/plugins/**/public`))}`,
  ]);

  // It will include entries that cannot be discovered
  // statically as they are required with dynamic imports.
  // In vis_type_timelion the problem is the loadFunctions()
  // which dynamically requires all the files inside of function folders
  // Another way would be to include an index file and import all the functions
  // using named imports
  const dynamicRequiredEntries = await globby([
    normalize(Path.resolve(baseDir, 'src/plugins/vis_types/timelion/server/**/*.js')),
  ]);

  // Compose all the needed entries
  const serverEntries = [...mainCodeEntries, ...discoveredPluginEntries, ...dynamicRequiredEntries];

  // Get the dependencies found searching through the server
  // side code entries that were provided
  const serverDependencies = await getDependencies(baseDir, serverEntries);

  // List of hardcoded dependencies that we need and that are not discovered
  // searching through code imports
  // TODO: remove this once we get rid off @kbn/ui-framework
  const hardCodedDependencies = ['@kbn/ui-framework'];

  // Consider this as our whiteList for the modules we can't delete
  const whiteListedModules = [...serverDependencies, ...hardCodedDependencies];

  const listedDependencies = Object.keys(listedPkgDependencies);
  const filteredListedDependencies = listedDependencies.filter((entry) => {
    return whiteListedModules.some((nonEntry) => entry.includes(nonEntry));
  });

  return filteredListedDependencies.reduce((foundUsedDeps: any, usedDep) => {
    if (listedPkgDependencies[usedDep]) {
      foundUsedDeps[usedDep] = listedPkgDependencies[usedDep];
    }

    return foundUsedDeps;
  }, {});
}
