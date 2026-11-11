/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import stripAnsi from 'strip-ansi';
import { readHelp } from './settings/launch_flags';
import type { ProcessDefinition, ToolOptions } from './types';

/**
 * Splits arguments typed by the user like a shell does: on whitespace, keeping quoted parts together, e.g.
 * `--scenarioOpts "a b"`. It does not expand variables or globs.
 */
export const splitArgs = (input: string): readonly string[] => {
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;
  let hasArg = false;
  for (const char of input) {
    if (quote) {
      if (char === quote) {
        quote = undefined;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
      hasArg = true;
    } else if (/\s/.test(char)) {
      if (hasArg) {
        args.push(current);
        current = '';
        hasArg = false;
      }
    } else {
      current += char;
      hasArg = true;
    }
  }
  if (quote) {
    throw new Error(`Unclosed ${quote} in the arguments`);
  }
  if (hasArg) {
    args.push(current);
  }
  return args;
};

// What scripts print on startup besides their help: the Browserslist update notice, and the APM agent's JSON line.
const STARTUP_NOISE = [
  /Browserslist: browsers data/,
  /update-browserslist-db/,
  /Why you should do it regularly/,
  /^\{"log\.level"/,
];

/** The lines of a --help output, without startup noise, colours and surrounding blank lines. */
export const cleanHelp = (output: string): readonly string[] => {
  const lines = stripAnsi(output)
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => !STARTUP_NOISE.some((noise) => noise.test(line)));
  const first = lines.findIndex((line) => line !== '');
  const last = lines.length - 1 - [...lines].reverse().findIndex((line) => line !== '');
  return first === -1 ? [] : lines.slice(first, last + 1);
};

interface ToolSpec {
  readonly id: string;
  readonly script: readonly string[];
  readonly description: string;
  readonly defaultArgs: string;
  readonly dependsOn: readonly string[];
}

const TOOL_SPECS: readonly ToolSpec[] = [
  {
    id: 'synthtrace',
    script: ['scripts', 'synthtrace'],
    description:
      'Generates APM, logs, infra and other data from a scenario; --live keeps generating',
    defaultArgs: 'logs_and_metrics --live',
    // It installs Fleet packages through Kibana before indexing.
    dependsOn: ['kibana'],
  },
  {
    id: 'connector-emulator',
    script: ['scripts', 'connector_emulate'],
    description:
      "Serves a connector's contract mock as an HTTP proxy; its log shows the Kibana settings to use it",
    defaultArgs: '--connector datadog',
    dependsOn: [],
  },
  {
    id: 'data-forge',
    script: ['x-pack', 'scripts', 'data_forge'],
    description:
      'Generates fake logs, hosts or stack data: --dataset fake_logs, fake_hosts or fake_stack',
    defaultArgs: '--dataset fake_logs',
    dependsOn: ['es'],
  },
];

/** Dev tools that run next to Elasticsearch and Kibana, started from the TUI with arguments the user can change. */
export const getDefaultTools = (repoRoot: string): readonly ProcessDefinition[] =>
  TOOL_SPECS.map(({ id, script, description, defaultArgs, dependsOn }) => {
    let args = defaultArgs;
    let help: Promise<readonly string[]> | undefined;
    const scriptPath = path.join(repoRoot, ...script);
    const tool: ToolOptions = {
      description,
      getArgs: () => args,
      setArgs: (input) => {
        splitArgs(input);
        args = input;
      },
      // Relative to the repository root, where scripts are run from.
      getCommand: () => ['node', script.join('/'), args].filter(Boolean).join(' '),
      helpCommand: `node ${script.join('/')} --help`,
      readHelp: () => {
        help ??= readHelp(process.execPath, [scriptPath, '--help'], repoRoot).then(cleanHelp);
        return help;
      },
    };
    return {
      id,
      command: process.execPath,
      args: () => [scriptPath, ...splitArgs(args)],
      cwd: repoRoot,
      dependsOn,
      ready: { type: 'spawned' },
      tool,
    };
  });
