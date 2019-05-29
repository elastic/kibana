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

import chalk from 'chalk';

import { isErrorLogged, markErrorLogged } from './errors';

import { createBuild } from './build';

export function createRunner({ config, log, buildOssDist, buildDefaultDist }) {
  async function execTask(desc, task, ...args) {
    log.info(desc);
    log.indent(4);

    const start = Date.now();
    const time = () => {
      const sec = (Date.now() - start) / 1000;
      const minStr = sec > 60 ? `${Math.floor(sec / 60)} min ` : '';
      const secStr = `${Math.round(sec % 60)} sec`;
      return chalk.dim(`${minStr}${secStr}`);
    };

    try {
      await task.run(config, log, ...args);
      log.success(chalk.green('✓'), time());
    } catch (error) {
      if (!isErrorLogged(error)) {
        log.error('failure', time());
        log.error(error);
        markErrorLogged(error);
      }

      throw error;
    } finally {
      log.indent(-4);
      log.write('');
    }
  }

  const builds = [];
  if (buildDefaultDist) {
    builds.push(
      createBuild({
        config,
        oss: false,
      })
    );
  }
  if (buildOssDist) {
    builds.push(
      createBuild({
        config,
        oss: true,
      })
    );
  }

  /**
   * Run a task by calling its `run()` method with three arguments:
   *    `config`: an object with methods for determining top-level config values, see `./config.js`
   *    `log`: an instance of the `ToolingLog`, see `../../tooling_log/tooling_log.js`
   *    `builds?`: If task does is not defined as `global: true` then it is called for each build and passed each one here.
   *
   * @param  {Task} task
   * @return {Promise<undefined>}
   */
  return async function run(task) {
    if (task.global) {
      await execTask(chalk`{dim [  global  ]} ${task.description}`, task, builds);
    } else {
      for (const build of builds) {
        await execTask(`${build.getLogTag()} ${task.description}`, task, build);
      }
    }
  };
}
