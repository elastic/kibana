/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Options for customizing CliError instances
 */
export interface CliErrorOptions {
  exitCode?: number;
  showHelp?: boolean;
}

/**
 * An error type with specicial behavior when it bubbles up all the way to the root of the CLI
 */
export class CliError extends Error {
  public readonly exitCode: number;
  public readonly showHelp: boolean;

  constructor(message: string, options: CliErrorOptions = {}) {
    super(message);

    this.exitCode = options.exitCode ?? 1;
    this.showHelp = options.showHelp ?? false;
  }
}
