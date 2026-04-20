/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import chalk from 'chalk';
import dedent from 'dedent';
import { getLogLevelFlagsHelp, getLogLevelFlagHelpItems } from '@kbn/tooling-log';

import type { FlagHelpItem } from './flags/types';
import type { Command } from './run/run_with_commands';

const DEFAULT_GLOBAL_USAGE = `node ${Path.relative(process.cwd(), process.argv[1])}`;
export const GLOBAL_FLAGS = dedent`
  --help             Show this message
`;

const GLOBAL_FLAG_ITEMS: FlagHelpItem[] = [{ flag: '--help', description: 'Show this message' }];

export function formatFlagHelpItems(items: FlagHelpItem[]): string {
  if (items.length === 0) return '';
  const maxWidth = Math.max(...items.map((item) => item.flag.length));
  const padWidth = maxWidth + 2;
  return items
    .map((item) => {
      const lines = item.description.split('\n');
      const firstLine = `${item.flag.padEnd(padWidth)}${lines[0]}`;
      const rest = lines.slice(1).map((l) => ' '.repeat(padWidth) + l);
      return [firstLine, ...rest].join('\n');
    })
    .join('\n');
}

export function indent(str: string, depth: number) {
  const prefix = ' '.repeat(depth);
  return str
    .split('\n')
    .map((line, i) => `${i > 0 ? `\n${prefix}` : ''}${line}`)
    .join('');
}

export function joinAndTrimLines(...strings: Array<string | undefined>) {
  return strings.filter(Boolean).join('\n').split('\n').filter(Boolean).join(`\n`);
}

export function getHelp({
  description,
  usage,
  flagHelp,
  defaultLogLevel,
  examples,
}: {
  description?: string;
  usage?: string;
  flagHelp?: string | FlagHelpItem[];
  defaultLogLevel?: string;
  examples?: string;
}) {
  const optionHelp = Array.isArray(flagHelp)
    ? formatFlagHelpItems([
        ...flagHelp,
        ...getLogLevelFlagHelpItems(defaultLogLevel),
        ...GLOBAL_FLAG_ITEMS,
      ])
    : joinAndTrimLines(dedent(flagHelp || ''), getLogLevelFlagsHelp(defaultLogLevel), GLOBAL_FLAGS);

  const examplesHelp = examples ? joinAndTrimLines('Examples:', examples) : '';

  return `
  ${dedent(usage || '') || DEFAULT_GLOBAL_USAGE}

  ${indent(dedent(description || 'Runs a dev task'), 2)}

  Options:
    ${indent(optionHelp, 4)}
${examplesHelp ? `\n  ${indent(examplesHelp, 4)}` : ''}
`;
}

export function getCommandLevelHelp({
  usage,
  globalFlagHelp,
  command,
}: {
  usage?: string;
  globalFlagHelp?: string | FlagHelpItem[];
  command: Command<any>;
}) {
  const globalUsage = dedent(usage || '') || DEFAULT_GLOBAL_USAGE;
  const globalHelp = Array.isArray(globalFlagHelp)
    ? formatFlagHelpItems([...globalFlagHelp, ...GLOBAL_FLAG_ITEMS])
    : joinAndTrimLines(dedent(globalFlagHelp || ''), GLOBAL_FLAGS);

  const commandUsage = dedent(command.usage || '') || `${command.name} [...args]`;
  const commandHelp = command.flags?.help;
  const commandFlags = Array.isArray(commandHelp)
    ? formatFlagHelpItems(commandHelp)
    : joinAndTrimLines(dedent(commandHelp || ''));

  return `
  ${globalUsage} ${commandUsage}

  ${indent(dedent(command.description || 'Runs a dev task'), 2)}

  Command-specific options:
    ${indent(commandFlags, 4)}

  Global options:
    ${indent(globalHelp, 4)}

  To see the help for other commands run:
    ${globalUsage} help [command]

  To see the list of commands run:
    ${globalUsage} --help\n\n`;
}

export function getHelpForAllCommands({
  description,
  usage,
  globalFlagHelp,
  commands,
}: {
  description?: string;
  usage?: string;
  globalFlagHelp?: string | FlagHelpItem[];
  commands: Array<Command<any>>;
}) {
  const globalUsage = dedent(usage || '') || DEFAULT_GLOBAL_USAGE;
  const globalHelp = Array.isArray(globalFlagHelp)
    ? formatFlagHelpItems([...globalFlagHelp, ...GLOBAL_FLAG_ITEMS])
    : joinAndTrimLines(dedent(globalFlagHelp || ''), GLOBAL_FLAGS);

  const commandsHelp = commands
    .map((command) => {
      const commandHelp = command.flags?.help;
      const optionText = Array.isArray(commandHelp)
        ? formatFlagHelpItems(commandHelp)
        : joinAndTrimLines(dedent(commandHelp || ''));

      const options = commandHelp
        ? '\n' +
          dedent`
            Options:
              ${indent(optionText, '              '.length)}
          ` +
          '\n'
        : '';

      return [
        chalk.bold.whiteBright.bgBlack(` ${dedent(command.usage || '') || command.name} `),
        `  ${indent(dedent(command.description || 'Runs a dev task'), 2)}`,
        ...[indent(options, 2)],
      ].join('\n');
    })
    .join('\n');

  return `
  ${globalUsage} [command] [...args]

  ${indent(dedent(description || 'Runs a dev task'), 2)}

  Commands:
    ${indent(commandsHelp, 4)}

  Global options:
    ${indent(globalHelp, 4)}

  To show the help information about a specific command run:
    ${globalUsage} help [command]\n\n`;
}
