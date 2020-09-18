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

import { inspect } from 'util';

import exitHook from 'exit-hook';

import { ToolingLog } from '../tooling_log';
import { isFailError } from './fail';

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
