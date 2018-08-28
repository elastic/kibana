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

import { ToolingLog } from '@kbn/dev-utils';
import chalk from 'chalk';
import execa from 'execa';
import Listr from 'listr';

import { Project } from './project';

class ProjectFailure {
  constructor(public project: Project, public error: execa.ExecaError) {}
}

export function execInProjects(
  log: ToolingLog,
  projects: Project[],
  cmd: string,
  getArgs: (project: Project) => string[]
) {
  const list = new Listr(
    projects.map(project => ({
      task: () =>
        execa(cmd, getArgs(project), {
          cwd: project.directory,
          env: chalk.enabled ? { FORCE_COLOR: 'true' } : {},
          stdio: ['ignore', 'pipe', 'pipe'],
        }).catch(error => {
          throw new ProjectFailure(project, error);
        }),
      title: project.name,
    })),
    {
      concurrent: true,
      exitOnError: false,
    }
  );

  list.run().catch((error: any) => {
    process.exitCode = 1;

    if (!error.errors) {
      log.error('Unhandled exception!');
      log.error(error);
      process.exit();
    }

    for (const e of error.errors) {
      if (e instanceof ProjectFailure) {
        log.write('');
        log.error(`${e.project.name} failed\n${e.error.stdout}`);
      } else {
        log.error(e);
      }
    }
  });
}
