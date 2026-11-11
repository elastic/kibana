/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
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
    const tool: ToolOptions = {
      description,
      getArgs: () => args,
      setArgs: (input) => {
        splitArgs(input);
        args = input;
      },
    };
    return {
      id,
      command: process.execPath,
      args: () => [path.join(repoRoot, ...script), ...splitArgs(args)],
      cwd: repoRoot,
      dependsOn,
      ready: { type: 'spawned' },
      tool,
    };
  });
