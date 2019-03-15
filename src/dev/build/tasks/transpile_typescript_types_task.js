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

import { exec } from '../lib';
import { Project } from '../../typescript';

export const TranspileTypescriptTypesTask = {
  description: 'Transpiling types with typescript compiler',

  async run(config, log, build) {
    // the types project is built inside the repo so x-pack can use it for it's in-repo build.
    const typesProjectRepo = new Project(config.resolveFromRepo('tsconfig.types.json'));
    const typesProjectBuild = new Project(build.resolvePath('tsconfig.types.json'));

    const projects = [
      typesProjectRepo.tsConfigPath,
      typesProjectBuild.tsConfigPath
    ];

    // compile each typescript config file
    for (const tsConfigPath of projects) {
      log.info(`Compiling`, tsConfigPath, 'project');
      await exec(
        log,
        require.resolve('typescript/bin/tsc'),
        [
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
