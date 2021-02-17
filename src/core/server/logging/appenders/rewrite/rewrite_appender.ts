/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { LogRecord, Appender, DisposableAppender } from '@kbn/logging';
import {
  createRewritePolicy,
  rewritePolicyConfigSchema,
  RewritePolicy,
  RewritePolicyConfig,
} from './policies';

export interface RewriteAppenderConfig {
  type: 'rewrite';
  /**
   * The {@link Appender | appender(s) } to pass the log event to after
   * implementing the specified rewrite policy.
   */
  appenders: string[];
  /**
   * The {@link RewritePolicy | policy} to use to manipulate the provided data.
   */
  policy: RewritePolicyConfig;
}

/**
 * Appender that can modify the `LogRecord` instances it receives before passing
 * them along to another {@link Appender}.
 * @internal
 */
export class RewriteAppender implements DisposableAppender {
  public static configSchema = schema.object({
    type: schema.literal('rewrite'),
    appenders: schema.arrayOf(schema.string(), { defaultValue: [] }),
    policy: rewritePolicyConfigSchema,
  });

  private appenders: Map<string, Appender> = new Map();
  private readonly policy: RewritePolicy;

  constructor(private readonly config: RewriteAppenderConfig) {
    this.policy = createRewritePolicy(config.policy);
  }

  /**
   * Modifies the `record` and passes it to the specified appender.
   * @param record `LogRecord` instance to be logged.
   */
  public append(record: LogRecord) {
    const rewriteedRecord = this.policy.rewrite(record);
    this.config.appenders.forEach((appenderName) => {
      const appender = this.appenders.get(appenderName);
      if (!appender) {
        throw new Error(
          `Rewrite Appender could not find appender key "${appenderName}". ` +
            'Be sure `appender.update()` is called before `appender.append()`.'
        );
      }
      appender.append(rewriteedRecord);
    });
  }

  /**
   * Updates `RewriteAppender` configuration.
   */
  public update({ appenders }: { appenders: Map<string, Appender> }) {
    this.appenders = appenders;

    // Ensure config only contains valid appenders.
    const unknownAppenderKey = this.config.appenders.find(
      (appenderKey) => !this.appenders.has(appenderKey)
    );

    if (unknownAppenderKey) {
      throw new Error(
        `Rewrite Appender config contains unknown appender key "${unknownAppenderKey}".`
      );
    }
  }

  /**
   * Disposes `RewriteAppender`.
   */
  public dispose() {
    // noop
  }
}
