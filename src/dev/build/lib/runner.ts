/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import { ToolingLog } from '@kbn/tooling-log';
import type { Message } from '@kbn/tooling-log';

import { isErrorLogged, markErrorLogged } from './errors';
import { Build } from './build';
import type { Config } from './config';

interface Options {
  config: Config;
  log: ToolingLog;
  bufferLogs?: boolean;
}

interface ParallelTaskGroupsOptions {
  config: Config;
  log: ToolingLog;
  taskGroups: ReadonlyArray<ReadonlyArray<Task | GlobalTask>>;
}

export interface GlobalTask {
  global: true;
  description: string;
  run(config: Config, log: ToolingLog): Promise<void>;
}

export interface Task {
  global?: false;
  description: string;
  run(config: Config, log: ToolingLog, build: Build): Promise<void>;
}

export function createRunner({ config, log, bufferLogs = false }: Options) {
  async function execTask(desc: string, task: GlobalTask): Promise<void>;
  async function execTask(desc: string, task: Task, build: Build): Promise<void>;
  async function execTask(desc: string, task: GlobalTask | Task, build?: Build): Promise<void> {
    if (!task.global && build && bufferLogs) {
      log.info(`Buffering logs for Task: ${desc}`);
    } else {
      log.info(desc);
    }

    try {
      await log.indent(bufferLogs ? 0 : 4, async () => {
        const start = Date.now();
        const time = () => {
          const secs = Math.round((Date.now() - start) / 1000);
          const m = Math.floor(secs / 60);
          const s = secs - m * 60;
          return chalk.dim(`${m ? `${m} min ` : ''}${s} sec`);
        };

        try {
          if (task.global) {
            await task.run(config, log);
          } else {
            // This shouldn't ever happen since we're passing the builds in below, but needed for TS
            if (!build) {
              throw new Error('Task is not global, but no build was provided');
            }
            await task.run(config, log, build);
          }
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
  builds.push(new Build(config, bufferLogs));

  /**
   * Run a task by calling its `run()` method with three arguments:
   *    `config`: an object with methods for determining top-level config values, see `./config.js`
   *    `log`: an instance of the `ToolingLog`
   *    `builds?`: If task does is not defined as `global: true` then it is called for each build and passed each one here.
   */
  return async function run(task: Task | GlobalTask) {
    if (task.global) {
      await execTask(chalk`{dim [  global  ]} ${task.description}`, task);
    } else {
      for (const build of builds) {
        const desc = `${build.getLogTag()} ${task.description}`;
        build.setBuildDesc(desc);

        await execTask(desc, task, build);
      }
    }
  };
}

function createBufferedLog(log: ToolingLog, messages: Message[]) {
  const bufferedLog = new ToolingLog();
  bufferedLog.setWriters([
    {
      write(message) {
        messages.push(message);
        return true;
      },
    },
  ]);
  bufferedLog.indent(log.getIndent());
  return bufferedLog;
}

/** Runs task groups concurrently. Put the longest group first: its logs stream, the rest are flushed after. */
export async function runTaskGroupsInParallel({
  config,
  log,
  taskGroups,
}: ParallelTaskGroupsOptions): Promise<void> {
  const buffers = taskGroups.map((): Message[] => []);
  const logs = taskGroups.map((_, i) => (i === 0 ? log : createBufferedLog(log, buffers[i])));
  const results = await Promise.allSettled(
    taskGroups.map(async (tasks, i) => {
      const run = createRunner({ config, log: logs[i] });
      for (const task of tasks) {
        await run(task);
      }
    })
  );

  for (const message of buffers.flat()) {
    for (const writer of log.getWriters()) {
      writer.write(message);
    }
  }

  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(({ reason }) => reason);
  if (errors.length === 1) {
    throw errors[0];
  }
  if (errors.length > 1) {
    throw markErrorLogged(new AggregateError(errors, `${errors.length} task groups failed`));
  }
}
