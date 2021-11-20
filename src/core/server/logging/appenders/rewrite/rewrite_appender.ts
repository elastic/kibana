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
   * The {@link Appender | appender(s)} to pass the log event to after
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
   * List of appenders that are dependencies of this appender.
   *
   * `addAppender` will throw an error when called with an appender
   * reference that isn't in this list.
   */
  public get appenderRefs() {
    return this.config.appenders;
  }

  /**
   * Appenders can be "attached" to this one so that the RewriteAppender
   * is able to act as a sort of middleware by calling `append` on other appenders.
   *
   * As appenders cannot be attached to each other until they are created,
   * the `addAppender` method is used to pass in a configured appender.
   */
  public addAppender(appenderRef: string, appender: Appender) {
    if (!this.appenderRefs.includes(appenderRef)) {
      throw new Error(
        `addAppender was called with an appender key that is missing from the appenderRefs: "${appenderRef}".`
      );
    }

    this.appenders.set(appenderRef, appender);
  }

  /**
   * Modifies the `record` and passes it to the specified appender.
   */
  public append(record: LogRecord) {
    const rewrittenRecord = this.policy.rewrite(record);
    for (const appenderRef of this.appenderRefs) {
      const appender = this.appenders.get(appenderRef);
      if (!appender) {
        throw new Error(
          `Rewrite Appender could not find appender key "${appenderRef}". ` +
            'Be sure `appender.addAppender()` was called before `appender.append()`.'
        );
      }
      appender.append(rewrittenRecord);
    }
  }

  /**
   * Disposes `RewriteAppender`.
   */
  public dispose() {
    this.appenders.clear();
  }
}
