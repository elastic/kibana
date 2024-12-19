/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { append } from './commands/append';
import {
  QueryOperator,
  BuilderCommand,
  Params,
  ChainedCommand,
  QueryBuilderToOperator,
} from './types';

export abstract class QueryBuilder implements QueryBuilderToOperator {
  protected readonly commands: BuilderCommand[] = [];

  public abstract build(): ChainedCommand;

  public toQueryOperator(): QueryOperator {
    return append(this.build());
  }

  protected buildChain(): ChainedCommand {
    const commandParts: string[] = [];
    const bindingParts: Params[] = [];

    for (let i = 0; i < this.commands.length; i++) {
      const currentCondition = this.commands[i];

      if (i > 0) {
        commandParts.push(currentCondition.type);
      }

      if (typeof currentCondition.command === 'function') {
        const innerCommand = currentCondition.command().buildChain();
        commandParts.push(
          currentCondition.nested ? `(${innerCommand.command})` : innerCommand.command
        );
        bindingParts.push(innerCommand.bindings ?? []);
      } else {
        commandParts.push(currentCondition.command);
        bindingParts.push(currentCondition.bindings ?? []);
      }
    }

    return {
      command: commandParts.join(' '),
      bindings: bindingParts.flatMap((binding) => binding),
    };
  }
}
