/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, pickLevelFromFlags } from '@kbn/tooling-log';
import { RunContext, RunOptions } from './run';
import { getFlags, FlagOptions, mergeFlagOptions } from './flags';
import { Cleanup } from './cleanup';
import { getHelpForAllCommands, getCommandLevelHelp } from './help';
import { createFlagError } from './fail';
import { withProcRunner } from '../proc_runner';
import { Metrics } from './metrics';

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
    const log = new ToolingLog({
      level: pickLevelFromFlags(globalFlags, {
        default: this.options.log?.defaultLevel,
      }),
      writeTo: process.stdout,
    });
    const metrics = new Metrics(log);

    const isHelpCommand = globalFlags._[0] === 'help';
    const commandName = isHelpCommand ? globalFlags._[1] : globalFlags._[0];
    const command = this.commands.find((c) => c.name === commandName);

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
          statsMeta: metrics.meta,
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
      await metrics.reportError(error?.message, commandName);
      // exitCode is set by `cleanup` when necessary
      process.exit();
    } finally {
      cleanup.execute();
    }

    await metrics.reportSuccess(commandName);
  }
}
