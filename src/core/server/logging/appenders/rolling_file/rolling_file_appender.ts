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
  rollingPolicyConfigSchema,
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
    policy: rollingPolicyConfigSchema,
    strategy: rollingStrategyConfigSchema,
  });

  private isRolling = false;
  private layout: Layout;
  private context: RollingFileContext;
  private fileManager: RollingFileManager;
  private policy: TriggeringPolicy;
  private strategy: RollingStrategy;
  private buffer: BufferAppender;

  /**
   * Creates FileAppender instance with specified layout and file path.
   */
  constructor(config: RollingFileAppenderConfig) {
    this.context = new RollingFileContext();
    this.fileManager = new RollingFileManager(config.path, this.context);
    this.layout = Layouts.create(config.layout);
    this.policy = createTriggeringPolicy(config.policy, this.context); // TODO: rename to TriggeringPolicy
    this.strategy = createRollingStrategy(config.path, config.strategy, this.context);
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
    }
    if (this.needRollover(record)) {
      this.buffer.append(record);
      this.performRollover();
    } else {
      this.fileManager.write(`${this.layout.format(record)}\n`);
    }
  }

  /**
   * Disposes `FileAppender`. Waits for the underlying file stream to be completely flushed and closed.
   */
  public async dispose() {
    await this.buffer.dispose();
    await this.fileManager.closeStream();
  }

  private async performRollover() {
    try {
      this.isRolling = true;
      await this.strategy.rollout();
      await this.fileManager.closeStream();
      this.isRolling = false;
      const pendingLogs = this.buffer.flush();
      for (const log of pendingLogs) {
        this.append(log);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('Error while rolling file: ', e);
    }
  }

  /**
   * Checks if the current even should trigger a rollover
   */
  private needRollover(record: LogRecord) {
    return this.policy.isTriggeringEvent(record);
  }
}
