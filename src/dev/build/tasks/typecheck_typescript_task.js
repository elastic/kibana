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

import { exec, write } from '../lib';
import { Project } from '../../typescript';

export const TypecheckTypescriptTask = {
  description: 'Typechecking sources with typescript compiler',

  async run(config, log, build) {
    // these projects are built in the build folder
    const browserProject = new Project(build.resolvePath('tsconfig.browser.json'));
    const defaultProject = new Project(build.resolvePath('tsconfig.json'));

    // update the browser config file to include **/public/**/* files
    await write(browserProject.tsConfigPath, JSON.stringify({
      ...browserProject.config,
      include: [
        ...browserProject.config.include,
        'src/**/public/**/*',
        'typings/**/*'
      ]
    }));

    // update the default config to exclude **/public/**/* files
    await write(defaultProject.tsConfigPath, JSON.stringify({
      ...defaultProject.config,
      exclude: [
        ...defaultProject.config.exclude,
        'src/**/public/**/*'
      ]
    }));

    const projects = [
      browserProject.tsConfigPath,
      defaultProject.tsConfigPath,
    ];

    // compile each typescript config file
    for (const tsConfigPath of projects) {
      log.info(`Typechecking`, tsConfigPath, 'project');
      await exec(
        log,
        require.resolve('typescript/bin/tsc'),
        [
          '--noEmit',
          '--pretty', 'true',
          '--project', tsConfigPath,
        ],
        {
          cwd: build.resolvePath(),
        }
      );
    }
  },
};
