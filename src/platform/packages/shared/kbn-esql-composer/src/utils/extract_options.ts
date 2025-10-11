/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CommandOptions } from '../types';

/**
 * Type guard to check if a value is a CommandOptions object
 */
export function isCommandOptions(value: unknown): value is CommandOptions {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'comment' in value;
}

/**
 * Extracts CommandOptions from the end of a variadic argument list.
 * Returns the options and the remaining arguments.
 */
export function extractOptions<TArg>(args: Array<TArg | CommandOptions>): {
  options: CommandOptions | undefined;
  remaining: TArg[];
} {
  if (args.length === 0) {
    return { options: undefined, remaining: [] };
  }

  const lastArg = args[args.length - 1];

  if (isCommandOptions(lastArg)) {
    return {
      options: lastArg,
      remaining: args.slice(0, -1) as TArg[],
    };
  }

  return {
    options: undefined,
    remaining: args as TArg[],
  };
}
