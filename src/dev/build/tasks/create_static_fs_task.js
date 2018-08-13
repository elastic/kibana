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

import { deleteAll } from '../lib';
import { dirname, relative } from 'path';
import { StaticFilesystemCreator } from 'static-link/dist/main';
import { calculateHash, isFile, mkdir, writeFile, copyFile, readFile } from 'static-link/dist/lib/common';

export const CreateStaticFilesystem = {
  description:
    'Creating StaticModulesFs and patching entryPoints',

  async run(config, log, build) {
    const createLoaderFile = async (filePath) => {
      const sourceFile = require.resolve(`static-link/dist/lib/static-loader`);
      await copyFile(sourceFile, filePath);
    };

    const patchEntryPoints = async (entryPoints, staticModulesLoader, staticModulesFs) => {
      for (const each of entryPoints) {
        const entrypoint = require.resolve(build.resolvePath(each));

        if (await isFile(entrypoint)) {
          let loaderPath = relative(dirname(entrypoint), staticModulesLoader).replace(/\\/g, '/');
          if (loaderPath.charAt(0) !== '.') {
            loaderPath = `./${loaderPath}`;
          }
          let fsPath = relative(dirname(entrypoint), staticModulesFs).replace(/\\/g, '/');
          fsPath = `\${__dirname }/${fsPath}`;
          let content = await readFile(entrypoint, { encoding: 'utf8' });
          const patchLine = `require('${loaderPath}').load(require.resolve(\`${fsPath}\`));\n`;
          let prefix = '';
          if (content.indexOf(patchLine) === -1) {
            const rx = /^#!.*$/gm.exec(content.toString());
            if (rx && rx.index === 0) {
              prefix = `${rx[0]}\n`;
              // remove prefix
              content = content.replace(prefix, '');
            }
            // strip existing loader
            content = content.replace(/^require.*static-loader.js.*$/gm, '');
            content = content.replace(/\/\/ load static module: .*$/gm, '');
            content = content.trim();
            content = `${prefix}// load static module: ${fsPath}\n${patchLine}\n${content}`;

            await writeFile(entrypoint, content);
          }
        }
      }
    };

    const addModulesToStaticModulesFs = async (nodeModulesDir, staticModulesFs, hash) => {
      const sf = new StaticFilesystemCreator();

      await sf.addFolder(nodeModulesDir, '/node_modules');
      await mkdir(dirname(staticModulesFs));
      await sf.write(staticModulesFs, hash);
    };

    const generateServerBundle = async () => {
      const nodeModulesDir = build.resolvePath('node_modules');
      const staticModulesDir = build.resolvePath('static_modules');
      const staticModulesFs = build.resolvePath(staticModulesDir, 'static_modules.fs');
      const staticModulesLoader = build.resolvePath(staticModulesDir, 'static_loader.js');
      const entryPointsToPatch = [
        'src/cli'
      ];

      const hash = calculateHash({
        staticModulesDir,
        staticModulesFs,
        staticModulesLoader,
        entryPointsToPatch
      });

      await createLoaderFile(staticModulesLoader);
      await patchEntryPoints(entryPointsToPatch, staticModulesLoader, staticModulesFs);
      await addModulesToStaticModulesFs(nodeModulesDir, staticModulesFs, hash);
    };

    await generateServerBundle();

    // Delete node_modules folder
    const nodeModulesDir = build.resolvePath('node_modules');

    await deleteAll(
      log,
      [
        `${nodeModulesDir}/**`
      ]
    );
  }
};
