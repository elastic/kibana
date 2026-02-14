/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface EsClusterExecOptions {
  skipSecuritySetup?: boolean;
  reportTime?: (...args: any[]) => void;
  startTime?: number;
  esArgs?: string[] | string;
  esJavaOpts?: string;
  password?: string;
  skipReadyCheck?: boolean;
  readyTimeout?: number;
  onEarlyExit?: (msg: string) => void;
  writeLogsToPath?: string;
  /**
   * Controls how much of Elasticsearch stdout is forwarded to the `ToolingLog`.
   *
   * Defaults to `'warn'`. When `writeLogsToPath` is set, stdout/stderr are written
   * to that file and not forwarded to the `ToolingLog`, regardless of this setting.
   */
  esStdoutLogLevel?: 'all' | 'info' | 'warn' | 'error' | 'silent';
  /** Disable creating a temp directory, allowing ES to write to OS's /tmp directory */
  disableEsTmpDir?: boolean;
}
