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

import { deleteAll, read, write } from '../../lib';
import { dirname, extname, isAbsolute, sep } from 'path';
import { readFileSync } from 'fs';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import globby from 'globby';
import pkgUp from 'pkg-up';

export const CleanClientModulesOnDLLTask = {
  description:
    'Cleaning client node_modules bundled into the DLL',

  async run(config, log, build) {
    const canRequire = (entry) => {
      try {
        let resolvedEntry = require.resolve(entry);

        if (resolvedEntry === entry) {
          resolvedEntry = require.resolve(build.resolvePath('node_modules', entry));
        }

        return resolvedEntry;

      } catch (e) {
        return false;
      }
    };

    const getDepsFromFile = (filePath) => {
      const natives = process.binding('natives');
      const dependencies = [];

      // Don't parse any other files than .js ones
      if (extname(filePath) !== '.js') {
        return dependencies;
      }

      // Read the file
      const content = readFileSync(filePath, { encoding: 'utf8' });

      // Parse and get AST
      const ast = parser.parse(content, {
        sourceType: 'unambiguous',
        plugins: [
          'asyncGenerators',
          'classProperties',
          'dynamicImport',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'objectRestSpread',
          'throwExpressions'
        ]
      });

      // Traverse and found dependencies on require + require.resolve
      const visitors = {
        CallExpression: ({ node }) => {
          const isRequire = (node) => {
            return node.callee && node.callee.type === 'Identifier' && node.callee.name === 'require';
          };

          const isRequireResolve = (node) => {
            return node.callee && node.callee.type === 'MemberExpression' && node.callee.object
              && node.callee.object.type === 'Identifier' && node.callee.object.name === 'require'
              && node.callee.property && node.callee.property.type === 'Identifier'
              && node.callee.property.name === 'resolve';
          };

          if (isRequire(node) || isRequireResolve(node)) {
            const nodeArguments = node.arguments;
            const reqArg = Array.isArray(nodeArguments) ? nodeArguments.shift() : null;

            if (!reqArg) {
              return;
            }

            if (reqArg.type === 'StringLiteral') {
              dependencies.push(reqArg.value);
            }
          }
        }
      };
      traverse(ast, visitors);

      // Filter node native modules from the result
      return dependencies.filter(dep => !natives[dep]);
    };

    // impl
    const baseDir = build.resolvePath('.');
    const kbnPkg = config.getKibanaPkg();
    const kbnPkgDeps = (kbnPkg && kbnPkg.dependencies) || {};
    const kbnWebpackLoaders = Object.keys(kbnPkgDeps).filter(dep => !!dep.includes('-loader'));
    const entries = [
      canRequire(build.resolvePath('src/cli')),
      canRequire(build.resolvePath('src/cli_keystore')),
      canRequire(build.resolvePath('src/cli_plugin')),
      canRequire(build.resolvePath('node_modules/x-pack')),
      ...kbnWebpackLoaders.map(loader => canRequire(build.resolvePath(`node_modules/${loader}`)))
    ];

    const globEntries = await globby([
      `${baseDir}/src/core_plugins/*/index.js`,
      `!${baseDir}/src/core_plugins/**/public`
    ]);

    entries.push(...globEntries);

    // Calculate server side dependencies
    const getDeps = async (entries, entriesMap = {}, deps = {}, wasParsed = {}) => {
      return new Promise((resolve) => {
        if (!entries.length) {
          return resolve(Object.keys(deps));
        }

        const dep = entries.shift();
        if (typeof dep !== 'string' || wasParsed[dep]) {
          return process.nextTick(async () => {
            resolve(await getDeps(entries, entriesMap, deps, wasParsed));
          });
        }

        wasParsed[dep] = true;

        const newEntries = getDepsFromFile(dep).reduce((filteredEntries, entry) => {
          const absEntryPath = build.resolvePath(dirname(dep), entry);
          const requiredPath = canRequire(absEntryPath);
          const relativeFile = !isAbsolute(entry);
          const requiredRelativePath = canRequire(entry);
          const isNodeModuleDep = relativeFile && !requiredPath && requiredRelativePath;
          const isNewEntry = relativeFile && requiredPath;

          if (isNodeModuleDep) {
            deps[entry] = true;
            if (!entriesMap[requiredRelativePath]) {
              filteredEntries.push(requiredRelativePath);
              entriesMap[requiredRelativePath] = true;
            }
          }

          if (isNewEntry && !wasParsed[requiredPath]) {
            if (!entriesMap[requiredPath]) {
              filteredEntries.push(requiredPath);
              entriesMap[requiredPath] = true;
            }
          }

          return filteredEntries;
        }, []);

        return process.nextTick(async () => {
          resolve(await getDeps([...entries, ...newEntries], entriesMap, deps, wasParsed));
        });
      });
    };

    // Delete repeated dependencies by mapping them to the top level path
    const serverDeps = await getDeps(entries);
    const baseServerDepsMap = serverDeps.reduce((baseDeps, dep) => {
      const calculateTLDep = (inputDep, outputDep = '') => {
        const depSplitPaths = inputDep.split(sep);
        const firstPart = depSplitPaths.shift();
        // it will always be the / not the os sep
        const outputDepFirstArgAppend = outputDep ? sep : '';

        outputDep += `${outputDepFirstArgAppend}${firstPart}`;

        if (firstPart.charAt(0) !== '@') {
          return outputDep;
        }

        return calculateTLDep(depSplitPaths.join(sep), outputDep);
      };

      const tlDEP = calculateTLDep(dep);
      baseDeps[tlDEP] = true;

      return baseDeps;
    }, {});
    const baseServerDeps = Object.keys(baseServerDepsMap);

    // Consider this as our blackList for the modules we can't delete
    const blackListModules = [
      ...baseServerDeps,
      ...kbnWebpackLoaders
    ];

    const optimizedBundlesFolder = build.resolvePath('optimize/bundles');
    const dllManifest = JSON.parse(
      await read(
        build.resolvePath(optimizedBundlesFolder, 'vendors.manifest.dll.json')
      )
    );

    const getDllModules = (manifest) => {
      if (!manifest || !manifest.content) {
        // It should fails if we don't have modules
        return [];
      }

      const modules = Object.keys(manifest.content);

      // Only includes modules who are not in the black list of modules
      // and there are not dll entry files
      return modules.filter(entry => {
        const isBlackListed = blackListModules.some(nonEntry => entry.includes(`node_modules${sep}${nonEntry}${sep}`));
        const isDllEntryFile = entry.includes('.entry.dll.js');

        return !isBlackListed && !isDllEntryFile;
      });
    };

    const cleanModule = async (moduleEntryPath) => {
      const modulePkgPath = await pkgUp(moduleEntryPath);
      const modulePkg = JSON.parse(await read(modulePkgPath));
      const moduleDir = dirname(modulePkgPath);

      // Cancel the cleanup for this module as it
      // was already done.
      if (modulePkg.cleaned) {
        return;
      }

      // Clear dependencies from dll module package.json
      if (modulePkg.dependencies) {
        modulePkg.dependencies = [];
      }

      // Clear devDependencies from dll module package.json
      if (modulePkg.devDependencies) {
        modulePkg.devDependencies = [];
      }

      // Delete module contents. It will delete everything
      // excepts package.json, images and css
      //
      // NOTE: We can't use cwd option with globby
      // until the following issue gets closed
      // https://github.com/sindresorhus/globby/issues/87
      const deletePatterns = await globby([
        `${moduleDir}/**`,
        `!${moduleDir}/**/*.+(css)`,
        `!${moduleDir}/**/*.+(gif|ico|jpeg|jpg|tiff|tif|svg|png|webp)`,
        `!${modulePkgPath}`,
      ]);
      await deleteAll(log, deletePatterns);

      // Mark this module as cleaned
      modulePkg.cleaned = true;

      // Rewrite modified package.json
      await write(
        modulePkgPath,
        JSON.stringify(modulePkg, null, 2)
      );
    };

    const buildEmptyEntryFile = async (moduleEntryPath) => {
      await write(
        moduleEntryPath,
        ''
      );
    };

    const modules = getDllModules(dllManifest);

    for (const relativeModuleEntryPath of modules) {
      const moduleEntryPath = build.resolvePath(relativeModuleEntryPath);

      await cleanModule(moduleEntryPath);
      await buildEmptyEntryFile(moduleEntryPath);
    }
  }
};
