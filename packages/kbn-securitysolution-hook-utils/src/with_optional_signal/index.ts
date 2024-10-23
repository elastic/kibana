/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface SignalArgs {
  signal: AbortSignal;
}

export type OptionalSignalArgs<Args> = Omit<Args, 'signal'> & Partial<SignalArgs>;

/**
 *
 * @param fn an async function receiving an AbortSignal argument
 *
 * @returns An async function where the AbortSignal argument is optional
 */
export const withOptionalSignal =
  <Args extends SignalArgs, Result>(fn: (args: Args) => Result) =>
  (args: OptionalSignalArgs<Args>): Result => {
    const signal = args.signal != null ? args.signal : new AbortController().signal;
    return fn({ ...args, signal } as Args);
  };
