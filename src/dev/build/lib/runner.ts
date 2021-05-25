/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { ToolingLog } from '@kbn/dev-utils';

import { isErrorLogged, markErrorLogged } from './errors';
import { Build } from './build';
import { Config } from './config';

interface Options {
  config: Config;
  log: ToolingLog;
}

export interface Task {
  description: string;
  run(config: Config, log: ToolingLog, build: Build): Promise<void>;
}

export function createRunner({ config, log }: Options) {
  async function execTask(desc: string, task: Task, lastArg: any) {
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
      await task.run(config, log, lastArg);
      log.success(chalk.green('✓'), time());
    } catch (error) {
      if (!isErrorLogged(error)) {
        log.error(`failure ${time()}`);
        log.error(error);
        markErrorLogged(error);
      }

      throw error;
    } finally {
      log.indent(-4);
      log.write('');
    }
  }

  const build: Build = new Build(config);

  /**
   * Run a task by calling its `run()` method with three arguments:
   *    `config`: an object with methods for determining top-level config values, see `./config.js`
   *    `log`: an instance of the `ToolingLog`, see `../../tooling_log/tooling_log.js`
   *    `build`: build to call the task on
   */
  return async function run(task: Task) {
    await execTask(`${build.getLogTag()} ${task.description}`, task, build);
  };
}
