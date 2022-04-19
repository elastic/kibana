/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { ToolingLog } from '@kbn/tooling-log';

import { isErrorLogged, markErrorLogged } from './errors';
import { Build } from './build';
import { Config } from './config';

interface Options {
  config: Config;
  log: ToolingLog;
}

export interface GlobalTask {
  global: true;
  description: string;
  run(config: Config, log: ToolingLog, builds: Build[]): Promise<void>;
}

export interface Task {
  global?: false;
  description: string;
  run(config: Config, log: ToolingLog, build: Build): Promise<void>;
}

export function createRunner({ config, log }: Options) {
  async function execTask(desc: string, task: Task | GlobalTask, lastArg: any) {
    log.info(desc);
    try {
      await log.indent(4, async () => {
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
        }
      });
    } finally {
      log.write('');
    }
  }

  const builds: Build[] = [];
  builds.push(new Build(config));

  /**
   * Run a task by calling its `run()` method with three arguments:
   *    `config`: an object with methods for determining top-level config values, see `./config.js`
   *    `log`: an instance of the `ToolingLog`
   *    `builds?`: If task does is not defined as `global: true` then it is called for each build and passed each one here.
   */
  return async function run(task: Task | GlobalTask) {
    if (task.global) {
      await execTask(chalk`{dim [  global  ]} ${task.description}`, task, builds);
    } else {
      for (const build of builds) {
        await execTask(`${build.getLogTag()} ${task.description}`, task, build);
      }
    }
  };
}
