/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type SubCommandTimeFn = <T>(id: string, block: () => Promise<T>) => Promise<T>;

export interface CommandRunContext {
  args: import('../lib/args.mjs').Args;
  log: import('@kbn/some-dev-log').SomeDevLog;
  time: SubCommandTimeFn;
}

/**
 * Description of a command that can be run by kbn/pm
 */
export interface Command {
  /**
   * The name of the command
   */
  name: string;

  /**
   * Additionall usage details which should be added after the command name
   */
  usage?: string;

  /**
   * Text to follow the name of the command in the help output
   */
  intro?: string;

  /**
   * Summary of the functionality for this command, printed
   * between the usage and flags help in the help output
   */
  description?: string;

  /**
   * Description of the flags this command accepts
   */
  flagsHelp?: string;

  /**
   * Function which executes the command.
   */
  run(ctx: CommandRunContext): Promise<void>;

  reportTimings?: {
    group: string;
    id: string;
  };
}
