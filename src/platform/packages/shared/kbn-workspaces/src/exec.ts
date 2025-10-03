/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Required } from 'utility-types';
import execa from 'execa';
import type { ExecaReturnValue } from 'execa';
import type { ExecOptions } from './types';

type ExecWithCwdOptions = Required<ExecOptions, 'cwd'>;

export async function exec(
  command: string,
  options: ExecWithCwdOptions
): Promise<ExecaReturnValue<string>>;

export async function exec(
  file: string,
  args: string[],
  options: ExecWithCwdOptions
): Promise<ExecaReturnValue<string>>;

export async function exec(
  ...args: [string, ExecWithCwdOptions] | [string, string[], ExecWithCwdOptions]
): Promise<ExecaReturnValue<string>> {
  const { cwd, env, log } = args.length === 2 ? args[1] : args[2];

  const execaOpts: execa.Options = {
    cwd,
    shell: false,
    env: { ...env, UNSAFE_DISABLE_NODE_VERSION_VALIDATION: '1' },
    extendEnv: true,
    stdio: 'pipe',
  };

  // Start the child process. We want to stream stdout/stderr and call
  // `log.verbose` immediately as data arrives instead of waiting for the
  // process to exit and then logging buffered output.
  let child: execa.ExecaChildProcess<string>;

  if (args.length === 2) {
    // A single command string is passed, which may contain shell-specific syntax like `&&` or `||`.
    // To ensure these are interpreted correctly, we must use a shell.
    child = execa.command(args[0], { ...execaOpts, shell: true });

    log.debug(`Running command with shell: ${args[0]} in ${cwd}`);
  } else {
    // A file and arguments array are passed, so we can execute it directly without a shell.
    child = execa(args[0], args[1], { ...execaOpts });
    log.debug(`Running command: ${args[0]} ${args[1].join(' ')} in ${cwd}`);
  }

  const enc = (execaOpts.encoding as BufferEncoding | undefined) ?? 'utf8';

  const toLogString = (chunk: Buffer | string) =>
    typeof chunk === 'string' ? chunk : enc === null ? chunk.toString() : chunk.toString(enc);

  if (child.stdout) {
    child.stdout.on('data', (chunk: Buffer | string) => {
      const s = toLogString(chunk);
      log.verbose(s);
    });
  }

  if (child.stderr) {
    child.stderr.on('data', (chunk: Buffer | string) => {
      const s = toLogString(chunk);
      log.verbose(s);
    });
  }

  // Wait for the process to finish and return the result (execa's promise)
  // which still contains stdout/stderr (may be empty because we disabled
  // buffering). Consumers of exec can still inspect exit code, etc.
  return await child;
}
