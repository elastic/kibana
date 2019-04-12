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
    const defaultProjectBuild = new Project(build.resolvePath('tsconfig.json'));
    const browserProjectBuild = new Project(build.resolvePath('tsconfig.browser.json'));

    // update the default config to exclude **/public/**/* files
    await write(defaultProjectBuild.tsConfigPath, JSON.stringify({
      ...defaultProjectBuild.config,
      exclude: [
        ...defaultProjectBuild.config.exclude,
        'src/**/public/**/*'
      ]
    }));

    // update the browser config file to include **/public/**/* files
    await write(browserProjectBuild.tsConfigPath, JSON.stringify({
      ...browserProjectBuild.config,
      include: [
        ...browserProjectBuild.config.include,
        'src/**/public/**/*',
        'typings/**/*',
        'target/types/**/*'
      ]
    }));

    // the types project is built inside the repo so x-pack can use it for it's in-repo build.
    const typesProjectRepo = new Project(config.resolveFromRepo('tsconfig.types.json'));
    const typesProjectBuild = new Project(build.resolvePath('tsconfig.types.json'));

    // update types config to include src/core/public/index.ts
    // unlike `include`, specifying the `files` configuration property
    // will include files regardless of any exclusion rules
    await write(typesProjectBuild.tsConfigPath, JSON.stringify({
      ...typesProjectBuild.config,
      files: [
        ...(typesProjectBuild.config.files || []),
        'src/core/public/index.ts'
      ]
    }));

    const typeProjects = [
      typesProjectRepo.tsConfigPath,
      typesProjectBuild.tsConfigPath,
    ];

    const buildProjects = [
      // Browser needs to be compiled before server code so that any shared code
      // is compiled to the lowest common denominator (server's CommonJS format)
      // which can be supported by both environments.
      browserProjectBuild.tsConfigPath,
      defaultProjectBuild.tsConfigPath,
    ];

    // Build all typescript project types and then build the project with --noEmit to check for type errors
    await Promise.all(typeProjects.map((tsConfigPath) => {
      log.info(`Building types for: ${tsConfigPath}`);
      return exec(
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
    }));

    await Promise.all(buildProjects.map((tsConfigPath) => {
      log.info(`Type checking: ${tsConfigPath}`);
      return exec(
        log,
        require.resolve('typescript/bin/tsc'),
        [
          '--noEmit', 'true',
          '--pretty', 'true',
          '--project', tsConfigPath,
        ],
        {
          cwd: build.resolvePath(),
        }
      );
    }));
  }
};
