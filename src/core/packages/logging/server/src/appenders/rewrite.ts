/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Configuration of a rewrite appender
 * @public
 */
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
 * Available rewrite policies which specify what part of a {@link LogRecord}
 * can be modified.
 */
export type RewritePolicyConfig = MetaRewritePolicyConfig;

export interface MetaRewritePolicyConfigProperty {
  path: string;
  value?: string | number | boolean | null;
}

export interface MetaRewritePolicyConfig {
  type: 'meta';

  /**
   * The 'mode' specifies what action to perform on the specified properties.
   *   - 'update' updates an existing property at the provided 'path'.
   *   - 'remove' removes an existing property at the provided 'path'.
   */
  mode: 'remove' | 'update';

  /**
   * The properties to modify.
   *
   * @remarks
   * Each provided 'path' is relative to the record's {@link LogMeta}.
   * For the 'remove' mode, no 'value' is provided.
   */
  properties: MetaRewritePolicyConfigProperty[];
}
