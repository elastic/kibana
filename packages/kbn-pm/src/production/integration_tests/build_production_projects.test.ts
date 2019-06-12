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

import copy from 'cpy';
import globby from 'globby';
import { join, resolve } from 'path';
import tempy from 'tempy';

import { readPackageJson } from '../../utils/package_json';
import { getProjects } from '../../utils/projects';
import { buildProductionProjects } from '../build_production_projects';

describe('kbn-pm production', () => {
  let tmpDir: string;
  let buildRoot: string;

  const timeout = 1 * 60 * 1000;

  beforeEach(async () => {
    tmpDir = tempy.directory();
    buildRoot = tempy.directory();
    const fixturesPath = resolve(__dirname, '__fixtures__');

    // Copy all the test fixtures into a tmp dir, as we will be mutating them
    await copy(['**/*'], tmpDir, {
      cwd: fixturesPath,
      dot: true,
      nodir: true,
      parents: true,
    });

    const projects = await getProjects(tmpDir, ['.', './packages/*']);

    for (const project of projects.values()) {
      // This will both install dependencies and generate `yarn.lock` files
      await project.installDependencies({
        extraArgs: ['--silent', '--no-progress'],
      });
    }
  }, timeout);

  test(
    'builds and copies projects for production',
    async () => {
      await buildProductionProjects({ kibanaRoot: tmpDir, buildRoot });

      const files = await globby(['**/*', '!**/node_modules/**'], {
        cwd: buildRoot,
      });

      expect(files.sort()).toMatchSnapshot();

      for (const file of files) {
        if (file.endsWith('package.json')) {
          expect(await readPackageJson(join(buildRoot, file))).toMatchSnapshot(file);
        }
      }
    },
    timeout
  );

  test(
    'builds and copies only OSS projects for production',
    async () => {
      await buildProductionProjects({ kibanaRoot: tmpDir, buildRoot, onlyOSS: true });

      const files = await globby(['**/*', '!**/node_modules/**'], {
        cwd: buildRoot,
      });

      expect(files.sort()).toMatchSnapshot();
    },
    timeout
  );
});
