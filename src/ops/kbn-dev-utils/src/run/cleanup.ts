/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import exitHook from 'exit-hook';
import { ToolingLog } from '@kbn/tooling-log';

import { isFailError } from './fail';

/**
 * A function which will be called when the CLI is torn-down which should
 * quickly cleanup whatever it needs.
 */
export type CleanupTask = () => void;

export class Cleanup {
  static setup(log: ToolingLog, helpText: string) {
    const onUnhandledRejection = (error: any) => {
      log.error('UNHANDLED PROMISE REJECTION');
      log.error(
        error instanceof Error
          ? error
          : new Error(`non-Error type rejection value: ${inspect(error)}`)
      );
      process.exit(1);
    };

    process.on('unhandledRejection', onUnhandledRejection);

    const cleanup = new Cleanup(log, helpText, [
      () => process.removeListener('unhandledRejection', onUnhandledRejection),
    ]);

    cleanup.add(exitHook(() => cleanup.execute()));

    return cleanup;
  }

  constructor(
    private readonly log: ToolingLog,
    public helpText: string,
    private readonly tasks: CleanupTask[]
  ) {}

  add(task: CleanupTask) {
    this.tasks.push(task);
  }

  execute(topLevelError?: any) {
    const tasks = this.tasks.slice(0);
    this.tasks.length = 0;

    for (const task of tasks) {
      try {
        task();
      } catch (error) {
        this.onError(error);
      }
    }

    if (topLevelError) {
      this.onError(topLevelError);
    }
  }

  private onError(error: any) {
    if (isFailError(error)) {
      this.log.error(error.message);

      if (error.showHelp) {
        this.log.write(this.helpText);
      }

      process.exitCode = error.exitCode;
    } else {
      this.log.error('UNHANDLED ERROR');
      this.log.error(error);
      process.exitCode = 1;
    }
  }
}
