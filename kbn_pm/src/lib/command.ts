/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Log } from './log.mjs';
import type { Args } from './args.mjs';

/**
 * Helper function to easily time specific parts of a kbn command. Does not produce
 * timings unless the reportTimings config is also defined
 */
export type SubCommandTimeFn = <T>(id: string, block: () => Promise<T>) => Promise<T>;

/**
 * Argument passed to the command run function
 */
export interface CommandRunContext {
  args: Args;
  log: Log;
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

  /**
   * Configuration to send timing data to ci-stats for this command. If the
   * time() fn is used those timing records will use the group from this config.
   * If this config is not used then the time() fn won't report any data.
   */
  reportTimings?: {
    group: string;
    id: string;
  };
}
