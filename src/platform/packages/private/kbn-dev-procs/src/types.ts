/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SettingsProvider } from './settings/types';

/** How the supervisor decides that a process is ready for its dependents. */
export type ReadyCheck =
  | { readonly type: 'log'; readonly pattern: RegExp }
  | {
      readonly type: 'http';
      readonly url: string;
      readonly auth?: { readonly username: string; readonly password: string };
      readonly intervalMs?: number;
    }
  | { readonly type: 'spawned' };

export interface ProcessDefinition {
  readonly id: string;
  readonly command: string;
  /** A function is called on every start, so a restart can pick up changed arguments. */
  readonly args: readonly string[] | (() => readonly string[]);
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly dependsOn?: readonly string[];
  readonly ready: ReadyCheck;
  readonly readyTimeoutMs?: number;
  readonly stopTimeoutMs?: number;
  /** Reads the settings the process runs with and the ones it supports, for the TUI. */
  readonly settings?: SettingsProvider;
  /** Makes this an optional tool: not started with the rest, but from the TUI, with arguments the user can change. */
  readonly tool?: ToolOptions;
}

export interface ToolOptions {
  readonly description: string;
  /** The arguments the tool starts with next, as the user typed them. */
  readonly getArgs: () => string;
  /** Throws when the arguments cannot be parsed, e.g. with an unclosed quote. */
  readonly setArgs: (input: string) => void;
  /** The command the help comes from, e.g. `node scripts/synthtrace --help`. */
  readonly helpCommand: string;
  /** Reads the tool's --help output, without the noise its startup prints. */
  readonly readHelp: () => Promise<readonly string[]>;
}

export type ProcessState =
  | 'waiting'
  | 'starting'
  | 'ready'
  | 'stopping'
  | 'stopped'
  | 'exited'
  | 'failed';

export interface ProcessStatus {
  readonly id: string;
  readonly state: ProcessState;
  readonly logFile: string;
  readonly pid?: number;
  readonly exitCode?: number | null;
  readonly signal?: string | null;
  readonly startedAt?: string;
  readonly readyAt?: string;
  readonly error?: string;
}

export interface LogLine {
  readonly processId: string;
  /** `help` is a tool's --help, shown in its pane before it starts. */
  readonly stream: 'stdout' | 'stderr' | 'help';
  readonly text: string;
  readonly time: number;
}

export interface SupervisorStatus {
  readonly supervisorPid: number;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly processes: readonly ProcessStatus[];
}
