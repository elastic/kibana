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

import { ToolingLog, pickLevelFromFlags } from '../tooling_log';
import { RunContext, RunOptions } from './run';
import { getFlags, FlagOptions, mergeFlagOptions } from './flags';
import { Cleanup } from './cleanup';
import { getHelpForAllCommands, getCommandLevelHelp } from './help';
import { createFlagError } from './fail';
import { withProcRunner } from '../proc_runner';

export type CommandRunFn<T> = (context: RunContext & T) => Promise<void> | void;

export interface Command<T> {
  name: string;
  run: CommandRunFn<T>;
  description: RunOptions['description'];
  usage?: RunOptions['usage'];
  flags?: FlagOptions;
}

export interface RunWithCommandsOptions<T> {
  log?: RunOptions['log'];
  description?: RunOptions['description'];
  usage?: RunOptions['usage'];
  globalFlags?: FlagOptions;
  extendContext?(context: RunContext): Promise<T> | T;
}

export class RunWithCommands<T> {
  constructor(
    private readonly options: RunWithCommandsOptions<T>,
    private readonly commands: Array<Command<T>> = []
  ) {}

  command(options: Command<T>) {
    return new RunWithCommands(this.options, this.commands.concat(options));
  }

  async execute() {
    const globalFlags = getFlags(process.argv.slice(2), {
      allowUnexpected: true,
    });

    const isHelpCommand = globalFlags._[0] === 'help';
    const commandName = isHelpCommand ? globalFlags._[1] : globalFlags._[0];
    const command = this.commands.find((c) => c.name === commandName);
    const log = new ToolingLog({
      level: pickLevelFromFlags(globalFlags, {
        default: this.options.log?.defaultLevel,
      }),
      writeTo: process.stdout,
    });

    const globalHelp = getHelpForAllCommands({
      description: this.options.description,
      usage: this.options.usage,
      globalFlagHelp: this.options.globalFlags?.help,
      commands: this.commands,
    });
    const cleanup = Cleanup.setup(log, globalHelp);

    if (!command) {
      if (globalFlags.help) {
        log.write(globalHelp);
        process.exit();
      }

      const error = createFlagError(
        commandName ? `unknown command [${commandName}]` : `missing command name`
      );
      cleanup.execute(error);
      process.exit(1);
    }

    const commandFlagOptions = mergeFlagOptions(this.options.globalFlags, command.flags);
    const commandFlags = getFlags(process.argv.slice(2), commandFlagOptions);
    // strip command name plus "help" if we're actually executing the fake "help" command
    if (isHelpCommand) {
      commandFlags._.splice(0, 2);
    } else {
      commandFlags._.splice(0, 1);
    }

    const commandHelp = getCommandLevelHelp({
      usage: this.options.usage,
      globalFlagHelp: this.options.globalFlags?.help,
      command,
    });
    cleanup.helpText = commandHelp;

    if (commandFlags.help || isHelpCommand) {
      cleanup.execute();
      log.write(commandHelp);
      process.exit();
    }

    if (!commandFlagOptions.allowUnexpected && commandFlags.unexpected.length) {
      cleanup.execute(createFlagError(`Unknown flag(s) "${commandFlags.unexpected.join('", "')}"`));
      return;
    }

    try {
      await withProcRunner(log, async (procRunner) => {
        const context: RunContext = {
          log,
          flags: commandFlags,
          procRunner,
          addCleanupTask: cleanup.add.bind(cleanup),
        };

        const extendedContext = {
          ...context,
          ...(this.options.extendContext ? await this.options.extendContext(context) : ({} as T)),
        };

        await command.run(extendedContext);
      });
    } catch (error) {
      cleanup.execute(error);
      // exitCode is set by `cleanup` when necessary
      process.exit();
    } finally {
      cleanup.execute();
    }
  }
}
