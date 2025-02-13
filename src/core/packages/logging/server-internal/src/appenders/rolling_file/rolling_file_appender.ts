/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { LogRecord, Layout, DisposableAppender } from '@kbn/logging';
import type { RollingFileAppenderConfig } from '@kbn/core-logging-server';
import { Layouts } from '../../layouts/layouts';
import { BufferAppender } from '../buffer/buffer_appender';
import {
  createTriggeringPolicy,
  triggeringPolicyConfigSchema,
  type TriggeringPolicy,
} from './policies';
import {
  createRollingStrategy,
  rollingStrategyConfigSchema,
  type RollingStrategy,
} from './strategies';
import {
  createRetentionPolicy,
  mergeRetentionPolicyConfig,
  retentionPolicyConfigSchema,
  type RetentionPolicy,
} from './retention';
import { RollingFileManager } from './rolling_file_manager';
import { RollingFileContext } from './rolling_file_context';

/**
 * Appender that formats all the `LogRecord` instances it receives and writes them to the specified file.
 * @internal
 */
export class RollingFileAppender implements DisposableAppender {
  public static configSchema = schema.object({
    type: schema.literal('rolling-file'),
    layout: Layouts.configSchema,
    fileName: schema.string(),
    policy: triggeringPolicyConfigSchema,
    strategy: rollingStrategyConfigSchema,
    retention: schema.maybe(retentionPolicyConfigSchema),
  });

  private isRolling = false;
  private disposed = false;
  private rollingPromise?: Promise<void>;

  private readonly layout: Layout;
  private readonly context: RollingFileContext;
  private readonly fileManager: RollingFileManager;
  private readonly triggeringPolicy: TriggeringPolicy;
  private readonly rollingStrategy: RollingStrategy;
  private readonly retentionPolicy: RetentionPolicy;
  private readonly buffer: BufferAppender;

  constructor(config: RollingFileAppenderConfig) {
    this.context = new RollingFileContext(config.fileName);
    this.context.refreshFileInfo();
    this.fileManager = new RollingFileManager(this.context);
    this.layout = Layouts.create(config.layout);
    this.triggeringPolicy = createTriggeringPolicy(config.policy, this.context);
    this.rollingStrategy = createRollingStrategy(config.strategy, this.context);
    this.retentionPolicy = createRetentionPolicy(
      mergeRetentionPolicyConfig(config.retention, config.strategy),
      this.context
    );
    this.buffer = new BufferAppender();
  }

  /**
   * Formats specified `record` and writes it to the specified file. If the record
   * would trigger a rollover, it will be performed before the effective write operation.
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
   * Disposes the appender.
   * If a rollout is currently in progress, it will be awaited.
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
      await this.rollingStrategy.rollout();
      await this.fileManager.closeStream();
      await this.retentionPolicy.apply();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[RollingFileAppender]: error while rolling file: ', e);
    }
    this.rollingPromise = undefined;
    this.isRolling = false;
    this.flushBuffer();
  }

  private flushBuffer() {
    const pendingLogs = this.buffer.flush();
    // in some extreme scenarios, `dispose` can be called during a rollover
    // where the internal buffered logs would trigger another rollover
    // (rollover started, logs keep coming and got buffered, dispose is called, rollover ends and we then flush)
    // this would cause a second rollover that would not be awaited
    // and could result in a race with the newly created appender
    // that would also be performing a rollover.
    // so if we are disposed, we just flush the buffer directly to the file instead to avoid losing the entries.
    for (const log of pendingLogs) {
      if (this.disposed) {
        this._writeToFile(log);
      } else {
        this.append(log);
      }
    }
  }

  /**
   * Checks if the current event should trigger a rollout
   */
  private needRollout(record: LogRecord) {
    return this.triggeringPolicy.isTriggeringEvent(record);
  }
}
