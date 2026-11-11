/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn } from 'child_process';
import type { SettingRow, SettingsEditor, SettingsList } from './types';

/** A command-line option of a start script, as its --help describes it. */
export interface LaunchFlag {
  readonly name: string;
  /** `<port>` for a required value, `[mode]` for an optional one. */
  readonly placeholder?: string;
  readonly arity: FlagArity;
  readonly description: string;
}

/**
 * Whether a flag takes a value: `value` when its help says so, `switch` when it says it does not, and
 * `switch or value` when it cannot tell, as kbn-es does not mark its options.
 */
export type FlagArity = 'value' | 'switch' | 'switch or value';

/** Flags the TUI toggles from the user, as `true`, or sets to a value. */
export type FlagOverrides = Map<string, string | true>;

// `  -p, --port <port>      The port to bind to` or `  --license         Run with a ... [default: trial]`
const OPTION_LINE = /^\s+(?:-\w,\s+)?(--[a-z][\w-]*)(?:\s+(<[^>]+>|\[[^\]]+\]))?\s{2,}(\S.*)$/;
const DEFAULT_HINT = /\[default: [^\]]*\]/;

const getArity = (
  placeholder: string | undefined,
  description: string,
  marksSwitches: boolean
): FlagArity => {
  if (placeholder?.startsWith('<') || DEFAULT_HINT.test(description)) {
    return 'value';
  }
  return placeholder || !marksSwitches ? 'switch or value' : 'switch';
};

/**
 * Reads the options from a script's --help output. `marksSwitches` says whether the help marks the options that
 * take a value, like commander's `--port <port>`; kbn-es does not, but writes `[default: trial]` for some of them.
 */
export const parseHelpFlags = (
  help: string,
  {
    exclude = [],
    marksSwitches,
  }: { readonly exclude?: readonly string[]; readonly marksSwitches: boolean }
): readonly LaunchFlag[] => {
  const flags = new Map<string, LaunchFlag>();
  for (const line of help.split('\n')) {
    const match = OPTION_LINE.exec(line);
    if (!match) {
      continue;
    }
    const [, name, placeholder, description] = match;
    if (exclude.includes(name) || flags.has(name)) {
      continue;
    }
    flags.set(name, {
      name,
      placeholder,
      arity: getArity(placeholder, description, marksSwitches),
      description: description.trim(),
    });
  }
  return [...flags.values()];
};

/** Runs a command with its --help arguments and returns everything it printed. */
export const readHelp = (command: string, args: readonly string[], cwd: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('error', reject);
    child.on('close', () => resolve(output));
  });

/** The flags in `args`, as they are passed on the command line: `--eis` or `--license basic`. */
const readStaticFlags = (args: readonly string[]): ReadonlyMap<string, string> => {
  const flags = new Map<string, string>();
  args.forEach((arg, index) => {
    if (!arg.startsWith('--')) {
      return;
    }
    const [name, inline] = arg.split(/=(.*)/s, 2);
    const next = args[index + 1];
    flags.set(name, inline ?? (next !== undefined && !next.startsWith('-') ? next : 'true'));
  });
  return flags;
};

/** The arguments for the flags set in the TUI. */
export const getFlagArgs = (overrides: FlagOverrides): readonly string[] =>
  [...overrides].flatMap(([name, value]) => (value === true ? [name] : [name, value]));

export interface LaunchFlagsOptions {
  /** The process id, used in messages. */
  readonly processId: string;
  readonly helpCommand: string;
  readonly helpArgs: readonly string[];
  readonly cwd: string;
  /** The arguments the process always starts with, such as --kibana-arg flags. */
  readonly staticArgs: readonly string[];
  /** The argument name the user passes static flags with, e.g. --kibana-arg. */
  readonly staticSource: string;
  /** Flags `node scripts/dev` sets itself. */
  readonly exclude: readonly string[];
  /** Whether the help marks the options that take a value; see parseHelpFlags. */
  readonly marksSwitches: boolean;
  readonly overrides: FlagOverrides;
}

const TUI_SOURCE = 'tui';

export const createLaunchFlags = (
  options: LaunchFlagsOptions
): { readonly list: () => Promise<SettingsList>; readonly editor: SettingsEditor } => {
  const {
    processId,
    helpCommand,
    helpArgs,
    cwd,
    staticArgs,
    staticSource,
    exclude,
    marksSwitches,
    overrides,
  } = options;
  let flags: Promise<readonly LaunchFlag[]> | undefined;
  const getFlags = () => {
    flags ??= readHelp(helpCommand, helpArgs, cwd).then((help) =>
      parseHelpFlags(help, { exclude, marksSwitches })
    );
    return flags;
  };
  const staticFlags = readStaticFlags(staticArgs);
  const applies = `press r on ${processId} to restart it with that (this run only)`;

  const toRow = ({ name, placeholder, arity, description }: LaunchFlag): SettingRow => {
    const override = overrides.get(name);
    const staticValue = staticFlags.get(name);
    return {
      key: name,
      ...(override !== undefined
        ? { value: override === true ? 'true' : override, source: TUI_SOURCE }
        : staticValue !== undefined
        ? { value: staticValue, source: staticSource }
        : {}),
      detail: [arity, placeholder, description].filter(Boolean).join(' · '),
    };
  };

  const editor: SettingsEditor = {
    set: async ({ key, source, detail }, input) => {
      if (source === staticSource) {
        throw new Error(`${key} is set by ${staticSource}, which the TUI cannot change`);
      }
      const value = input.trim();
      if (value === 'false') {
        overrides.delete(key);
        return { message: `${processId} starts without ${key}; ${applies}`, needsRestart: true };
      }
      if (value === '' || (value === 'true' && detail?.startsWith('value '))) {
        throw new Error(`${key} takes a value; press e to enter it`);
      }
      overrides.set(key, value === 'true' ? true : value);
      const shown = value === 'true' ? key : `${key} ${value}`;
      return { message: `${processId} starts with ${shown}; ${applies}`, needsRestart: true };
    },
    unset: async ({ key, source }) => {
      if (source === staticSource) {
        throw new Error(`${key} is set by ${staticSource}, which the TUI cannot change`);
      }
      if (!overrides.delete(key)) {
        throw new Error(`${key} is not set`);
      }
      return { message: `${processId} starts without ${key}; ${applies}`, needsRestart: true };
    },
  };

  return {
    editor,
    list: async () => {
      const all = await getFlags();
      return {
        rows: all.map(toRow),
        notes: [
          `Options of the start script, from its --help; ● marks the ones it runs with. Flags set here apply to this run only.`,
        ],
      };
    },
  };
};
