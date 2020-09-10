/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Path from 'path';

import 'core-js/features/string/repeat';
import dedent from 'dedent';

import { Command } from './run_with_commands';

const DEFAULT_GLOBAL_USAGE = `node ${Path.relative(process.cwd(), process.argv[1])}`;
export const GLOBAL_FLAGS = dedent`
  --verbose, -v      Log verbosely
  --debug            Log debug messages (less than verbose)
  --quiet            Only log errors
  --silent           Don't log anything
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
}: {
  description?: string;
  usage?: string;
  flagHelp?: string;
}) {
  const optionHelp = joinAndTrimLines(dedent(flagHelp || ''), GLOBAL_FLAGS);

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
        dedent(command.usage || '') || command.name,
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
