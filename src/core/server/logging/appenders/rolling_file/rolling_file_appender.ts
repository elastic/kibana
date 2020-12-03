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

import { schema } from '@kbn/config-schema';
import { LogRecord, Layout, DisposableAppender } from '@kbn/logging';
import { Layouts, LayoutConfigType } from '../../layouts/layouts';
import { BufferAppender } from '../buffer/buffer_appender';
import {
  TriggeringPolicyConfig,
  createTriggeringPolicy,
  triggeringPolicyConfigSchema,
  TriggeringPolicy,
} from './policies';
import {
  RollingStrategy,
  createRollingStrategy,
  RollingStrategyConfig,
  rollingStrategyConfigSchema,
} from './strategies';
import { RollingFileManager } from './rolling_file_manager';
import { RollingFileContext } from './rolling_file_context';

export interface RollingFileAppenderConfig {
  kind: 'rolling-file';
  /**
   * The layout to use when writing log entries
   */
  layout: LayoutConfigType;
  /**
   * The absolute path of the file to write to.
   * If the file, or any of its parent directories, do not exist, they will be created.
   */
  path: string;
  /**
   * The policy to use to determine if a rollover should occur.
   */
  policy: TriggeringPolicyConfig;
  /**
   * The rollout strategy to use for rolling.
   */
  strategy: RollingStrategyConfig;
}

/**
 * Appender that formats all the `LogRecord` instances it receives and writes them to the specified file.
 * @internal
 */
export class RollingFileAppender implements DisposableAppender {
  public static configSchema = schema.object({
    kind: schema.literal('rolling-file'),
    layout: Layouts.configSchema,
    path: schema.string(),
    policy: triggeringPolicyConfigSchema,
    strategy: rollingStrategyConfigSchema,
  });

  private isRolling = false;
  private disposed = false;
  private rollingPromise?: Promise<void>;

  private readonly layout: Layout;
  private readonly context: RollingFileContext;
  private readonly fileManager: RollingFileManager;
  private readonly policy: TriggeringPolicy;
  private readonly strategy: RollingStrategy;
  private readonly buffer: BufferAppender;

  /**
   * Creates FileAppender instance with specified layout and file path.
   */
  constructor(config: RollingFileAppenderConfig) {
    this.context = new RollingFileContext(config.path);
    this.context.refreshFileInfo();
    this.fileManager = new RollingFileManager(this.context);
    this.layout = Layouts.create(config.layout);
    this.policy = createTriggeringPolicy(config.policy, this.context);
    this.strategy = createRollingStrategy(config.strategy, this.context);
    this.buffer = new BufferAppender();
  }

  /**
   * Formats specified `record` and writes them to the specified file.
   * @param record `LogRecord` instance to be logged.
   */
  public append(record: LogRecord) {
    // if we are currently rolling the files, push the log record
    // into the buffer, which will be flushed once rolling is complete
    if (this.isRolling) {
      this.buffer.append(record);
      return;
    }
    if (this.needRollout(record)) {
      this.buffer.append(record);
      this.rollingPromise = this.performRollout();
      return;
    }

    this._writeToFile(record);
  }

  private _writeToFile(record: LogRecord) {
    this.fileManager.write(`${this.layout.format(record)}\n`);
  }

  /**
   * Disposes `FileAppender`. Waits for the underlying file stream to be completely flushed and closed.
   */
  public async dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.rollingPromise) {
      await this.rollingPromise;
    }
    await this.buffer.dispose();
    await this.fileManager.closeStream();
  }

  private async performRollout() {
    if (this.isRolling) {
      return;
    }
    this.isRolling = true;
    try {
      await this.strategy.rollout();
      await this.fileManager.closeStream();
      this.rollingPromise = undefined;
      this.isRolling = false;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('Error while rolling file: ', e);
    } finally {
      this.flushBuffer();
    }
  }

  private flushBuffer() {
    const pendingLogs = this.buffer.flush();
    // in some extreme scenarios, `dispose` can be called during a rollover
    // where the internal buffered logs would trigger another rollover
    // (rollover started, logs keep coming and got buffered, dispose is called, rollover ends and we then flush)
    // this would cause a second rollover that would not be awaited
    // and could result in a race with the newly created appender
    // that would also be performing a rollover.
    // so if we are disposed, we just flush the buffer directly to the file instead to avoid loosing the entries.
    for (const log of pendingLogs) {
      if (this.disposed) {
        this._writeToFile(log);
      } else {
        this.append(log);
      }
    }
  }

  /**
   * Checks if the current even should trigger a rollout
   */
  private needRollout(record: LogRecord) {
    return this.policy.isTriggeringEvent(record);
  }
}
