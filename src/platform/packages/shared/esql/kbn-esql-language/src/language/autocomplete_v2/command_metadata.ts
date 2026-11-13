/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esqlCommandRegistry } from '../../commands/registry';
import type { ICommand } from '../../commands/registry/registry';
import { getCommandStarts } from '../../esql_js_sim/grammar';

let commandsByRule: Map<string, ICommand> | undefined;

/**
 * Kibana names a command by what the user types: its name, or one of its types for a command
 * that starts in several ways. The grammar names it by its rule. The two meet at the tokens
 * that start the command.
 */
const getCommandsByRule = (): Map<string, ICommand> => {
  if (!commandsByRule) {
    const commands = esqlCommandRegistry.getAllCommands();

    commandsByRule = new Map();
    for (const [rule, starts] of Object.entries(getCommandStarts())) {
      const texts = starts.map(({ text }) => text);
      const command = commands.find(
        ({ name, metadata }) =>
          texts.includes(name.replace(/\s+/g, '')) ||
          (metadata.types ?? []).some((type) => texts.includes(type.name.toLowerCase()))
      );

      if (command) {
        commandsByRule.set(rule, command);
      }
    }
  }

  return commandsByRule;
};

/**
 * The command Kibana has registered for the grammar rule of a command. Undefined for a command
 * that is in the grammar and that Kibana has not adopted. The engine reads a command's
 * metadata through this function only.
 */
export const getRegisteredCommand = (commandRule: string): ICommand | undefined =>
  getCommandsByRule().get(commandRule);
