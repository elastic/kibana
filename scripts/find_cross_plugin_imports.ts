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

import Path from 'path';
import Fs from 'fs';

import globby from 'globby';
import { run, REPO_ROOT } from '@kbn/dev-utils';

run(async ({ log }) => {
  const statFilePaths = await globby(
    [
      '**/target/public/stats.json',
      '!**/{examples,node_modules,fixtures,__fixtures__,sao_template}/**',
    ],
    {
      cwd: REPO_ROOT,
    }
  );

  // log.success(inspect(files, { maxArrayLength: Infinity }));

  const plugins = statFilePaths.map((statFilePath) => {
    const root = Path.resolve(Path.dirname(statFilePath), '../..');

    let id;
    try {
      const manifest = JSON.parse(Fs.readFileSync(Path.resolve(root, 'kibana.json'), 'utf8'));
      id = manifest.id;
    } catch (error) {
      id = Path.basename(root);
    }

    const publicDir = Path.resolve(root, 'public');
    return {
      id,
      publicDir,
      statFilePath,
    };
  });

  for (const plugin of plugins) {
    const stats = JSON.parse(Fs.readFileSync(plugin.statFilePath, 'utf8'));
    const [id] = Object.keys(stats.entrypoints);
    const mainChunk = stats.chunks.find((c) => c.id === id);
    const moduleCount = stats.modules.length;
    const mainAssetSize = stats.assets.find((a) => a.name === `${id}.entry.js` || `${id}.plugin.js`)
      .size;

    const modules = (stats.modules as any[])
      .filter((m) => !m.identifier.startsWith('external'))
      .filter((m) => m.chunks.includes(mainChunk.id))
      .map((m) => {
        const idParts = m.identifier.split('!');
        const last = idParts.pop();
        const [modulePath] = last.split('?');
        return modulePath as string;
      })
      .filter((m) => !m.includes('/node_modules/'));

    const importedPlugins = plugins
      .map((p) => {
        if (p.id === id) {
          return { plugin: p, modules: [] };
        }

        return { plugin: p, modules: modules.filter((m) => m.startsWith(p.publicDir)) };
      })
      .filter((i) => i.modules.length);

    log.info(id, moduleCount, mainAssetSize, importedPlugins);

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
});
