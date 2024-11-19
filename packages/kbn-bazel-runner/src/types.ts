/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Options that can be used to customize how Bazel is run
 */
export interface BazelRunOptions {
  /**
   * Current working directory to run bazel in
   */
  cwd?: string;
  /**
   * Custom environment variables to define for the bazel process
   */
  env?: Record<string, string>;
  /**
   * Prevent logging bazel output unless there is something wrong
   */
  quiet?: boolean;
  /**
   * Prefix to write before each line of output, does nothing if `quiet` is true.
   */
  logPrefix?: string;
  /**
   * Error handler which can be used to throw custom error types when bazel failes. Output will
   * be empty unless `quiet` is true
   */
  onErrorExit?: (core: number, output: string) => void;
}
