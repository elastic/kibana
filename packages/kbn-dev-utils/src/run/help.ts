/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import chalk from 'chalk';
import 'core-js/features/string/repeat';
import dedent from 'dedent';
import { getLogLevelFlagsHelp } from '@kbn/tooling-log';

import { Command } from './run_with_commands';

const DEFAULT_GLOBAL_USAGE = `node ${Path.relative(process.cwd(), process.argv[1])}`;
export const GLOBAL_FLAGS = dedent`
  --help             Show this message
`;

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
}: {
  description?: string;
  usage?: string;
  flagHelp?: string;
  defaultLogLevel?: string;
}) {
  const optionHelp = joinAndTrimLines(
    dedent(flagHelp || ''),
    getLogLevelFlagsHelp(defaultLogLevel),
    GLOBAL_FLAGS
  );

  return `
  ${dedent(usage || '') || DEFAULT_GLOBAL_USAGE}

  ${indent(dedent(description || 'Runs a dev task'), 2)}

  Options:
    ${indent(optionHelp, 4)}\n\n`;
}

export function getCommandLevelHelp({
  usage,
  globalFlagHelp,
  command,
}: {
  usage?: string;
  globalFlagHelp?: string;
  command: Command<any>;
}) {
  const globalUsage = dedent(usage || '') || DEFAULT_GLOBAL_USAGE;
  const globalHelp = joinAndTrimLines(dedent(globalFlagHelp || ''), GLOBAL_FLAGS);

  const commandUsage = dedent(command.usage || '') || `${command.name} [...args]`;
  const commandFlags = joinAndTrimLines(dedent(command.flags?.help || ''));

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
  globalFlagHelp?: string;
  commands: Array<Command<any>>;
}) {
  const globalUsage = dedent(usage || '') || DEFAULT_GLOBAL_USAGE;
  const globalHelp = joinAndTrimLines(dedent(globalFlagHelp || ''), GLOBAL_FLAGS);

  const commandsHelp = commands
    .map((command) => {
      const options = command.flags?.help
        ? '\n' +
          dedent`
            Options:
              ${indent(
                joinAndTrimLines(dedent(command.flags?.help || '')),
                '              '.length
              )}
          ` +
          '\n'
        : '';

      return [
        chalk.bold.whiteBright.bgBlack(` ${dedent(command.usage || '') || command.name} `),
        `  ${indent(dedent(command.description || 'Runs a dev task'), 2)}`,
        ...([indent(options, 2)] || []),
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
