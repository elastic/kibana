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

import { getCommandLevelHelp, getHelp, getHelpForAllCommands } from './help';
import { Command } from './run_with_commands';

const fooCommand: Command<any> = {
  description: `
    Some thing that we wrote to help us execute things.

    Example:

      foo = bar = baz

      Are you getting it?
  `,
  name: 'foo',
  run: () => {},
  flags: {
    help: `
      --foo              Some flag
      --bar              Another flag
                          Secondary info
      --baz, -b          Hey hello
    `,
  },
  usage: 'foo [...names]',
};

const barCommand: Command<any> = {
  description: `
    Some other thing that we wrote to help us execute things.
  `,
  name: 'bar',
  run: () => {},
  flags: {
    help: `
      --baz, -b          Hey hello
    `,
  },
  usage: 'bar [...names]',
};

describe.skip('getHelp()', () => {
  it('returns the expected output', () => {
    expect(
      getHelp({
        description: fooCommand.description,
        flagHelp: fooCommand.flags?.help,
        usage: `
          node scripts/foo --bar --baz
        `,
      })
    ).toMatchInlineSnapshot(`
      "
        node scripts/foo --bar --baz

        Some thing that we wrote to help us execute things.
        
        Example:
        
          foo = bar = baz
        
          Are you getting it?

        Options:
          --foo              Some flag
          --bar              Another flag
                              Secondary info
          --baz, -b          Hey hello
          --verbose, -v      Log verbosely
          --debug            Log debug messages (less than verbose)
          --quiet            Only log errors
          --silent           Don't log anything
          --help             Show this message

      "
    `);
  });
});

describe.skip('getCommandLevelHelp()', () => {
  it('returns the expected output', () => {
    expect(
      getCommandLevelHelp({
        command: fooCommand,
        globalFlagHelp: `
          --global-flag      some flag that applies to all commands
        `,
      })
    ).toMatchInlineSnapshot(`
      "
        node node_modules/jest-worker/build/workers/processChild.js foo [...names]

        Some thing that we wrote to help us execute things.
        
        Example:
        
          foo = bar = baz
        
          Are you getting it?

        Command-specific options:
          --foo              Some flag
          --bar              Another flag
                              Secondary info
          --baz, -b          Hey hello

        Global options:
          --global-flag      some flag that applies to all commands
          --verbose, -v      Log verbosely
          --debug            Log debug messages (less than verbose)
          --quiet            Only log errors
          --silent           Don't log anything
          --help             Show this message

        To see the help for other commands run:
          node node_modules/jest-worker/build/workers/processChild.js help [command]

        To see the list of commands run:
          node node_modules/jest-worker/build/workers/processChild.js --help

      "
    `);
  });
});

describe.skip('getHelpForAllCommands()', () => {
  it('returns the expected output', () => {
    expect(
      getHelpForAllCommands({
        commands: [fooCommand, barCommand],
        globalFlagHelp: `
          --global-flag      some flag that applies to all commands
        `,
        usage: `
          node scripts/my_cli
        `,
      })
    ).toMatchInlineSnapshot(`
      "
        node scripts/my_cli [command] [...args]

        Runs a dev task

        Commands:
          foo [...names]
            Some thing that we wrote to help us execute things.
            
            Example:
            
              foo = bar = baz
            
              Are you getting it?
          
            Options:
              --foo              Some flag
              --bar              Another flag
                                  Secondary info
              --baz, -b          Hey hello
            
          bar [...names]
            Some other thing that we wrote to help us execute things.
          
            Options:
              --baz, -b          Hey hello
            

        Global options:
          --global-flag      some flag that applies to all commands
          --verbose, -v      Log verbosely
          --debug            Log debug messages (less than verbose)
          --quiet            Only log errors
          --silent           Don't log anything
          --help             Show this message

        To show the help information about a specific command run:
          node scripts/my_cli help [command]

      "
    `);
  });
});
