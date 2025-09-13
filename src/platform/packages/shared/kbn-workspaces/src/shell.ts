/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import type { ExecaReturnValue } from 'execa';

interface ShellOptions {
  log: ToolingLog;
  cwd: string;
  env?: Record<string, string>;
}

export async function shell(
  command: string,
  options: ShellOptions
): Promise<ExecaReturnValue<string>>;

export async function shell(
  file: string,
  args: string[],
  options: ShellOptions
): Promise<ExecaReturnValue<string>>;

export async function shell(
  ...args: [string, ShellOptions] | [string, string[], ShellOptions]
): Promise<ExecaReturnValue<string>> {
  const { cwd, env, log } = args.length === 2 ? args[1] : args[2];

  const execaOpts = {
    cwd,
    shell: true,
    env: { ...process.env, ...env, UNSAFE_DISABLE_NODE_VERSION_VALIDATION: '1' },
    stdio: 'pipe' as const,
  };

  const result =
    args.length === 2
      ? await execa.command(args[0], execaOpts)
      : await execa(args[0], args[1], execaOpts);

  const stdout = result.stdout?.trim();
  const stderr = (result as any).stderr?.trim();
  if (stdout) {
    for (const line of stdout.split(/\r?\n/)) {
      if (line) log.verbose(line);
    }
  }
  if (stderr) {
    for (const line of stderr.split(/\r?\n/)) {
      if (line) log.verbose(line);
    }
  }

  return result;
}
