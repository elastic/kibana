/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { append } from '../pipeline/append';
import type { CommandOptions } from '../types';

/**
 * Appends a `KEEP` command to the ESQL composer pipeline.
 *
 * @param columns The columns to keep.
 * @param options Optional configuration including comment.
 * @returns A `QueryPipeline` instance with the `KEEP` command appended.
 */
export function keep(columns: Array<string | string[]>, options?: CommandOptions): ReturnType<typeof append>;
export function keep(...columns: Array<string | string[]>): ReturnType<typeof append>;
export function keep(...args: Array<string | string[] | CommandOptions>): ReturnType<typeof append> {
  // Check if last argument is options object (must be an object with 'comment' property, not a string or array)
  const lastArg = args[args.length - 1];
  const isOptions = 
    typeof lastArg === 'object' && 
    lastArg !== null && 
    !Array.isArray(lastArg) && 
    'comment' in lastArg;
  
  const options = isOptions ? (lastArg as CommandOptions) : undefined;
  const columns = isOptions ? args.slice(0, -1) : args;
  
  const command = `KEEP ${columns.flatMap((column) => column).join(', ')}`;

  return append({ command, comment: options?.comment });
}
