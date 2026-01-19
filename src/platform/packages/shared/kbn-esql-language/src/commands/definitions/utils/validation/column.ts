/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { walk, within } from '../../../../ast';
import type { ESQLColumn, ESQLCommand, ESQLIdentifier, ESQLMessage } from '../../../../types';
import { UnmappedFieldsStrategy, type ICommandContext } from '../../../registry/types';
import { errors } from '../errors';
import { getColumnExists } from '../columns';
import { isParametrized } from '../../../../ast/is';
import { esqlCommandRegistry } from '../../..';

export function validateColumnForCommand(
  column: ESQLColumn | ESQLIdentifier,
  commandName: string,
  context: ICommandContext,
  ast: ESQLCommand[]
): ESQLMessage[] {
  return new ColumnValidator(column, context, commandName, ast).validate();
}

export class ColumnValidator {
  constructor(
    private readonly column: ESQLColumn | ESQLIdentifier,
    private readonly context: ICommandContext,
    private readonly commandName: string,
    private readonly ast: ESQLCommand[]
  ) {}

  validate(): ESQLMessage[] {
    if (!this.exists) {
      if (this.isUnmappedColumnAllowed && !this.columnHasBeenRemoved) {
        return [errors.unmappedColumnWarning(this.column)];
      } else {
        return [errors.unknownColumn(this.column)];
      }
    }

    return [];
  }

  private get exists(): boolean {
    if (
      !isParametrized(this.column) &&
      !getColumnExists(this.column, this.context, this.commandName === 'row')
    ) {
      return false;
    }

    return true;
  }

  private get isUnmappedColumnAllowed(): boolean {
    const unmappedFieldsStrategy = this.context.unmappedFieldsStrategy;
    return (
      unmappedFieldsStrategy === UnmappedFieldsStrategy.LOAD ||
      unmappedFieldsStrategy === UnmappedFieldsStrategy.NULLIFY
    );
  }

  /**
   * Checks if the column has been removed in previous commands in the AST.
   * This can happen if the column has been dropped or renamed.
   */
  private get columnHasBeenRemoved(): boolean {
    const commandPositionInAST = this.ast.findIndex((cmd) => within(this.column, cmd));
    if (commandPositionInAST === -1) {
      return false;
    }

    const previousCommands = this.ast.slice(0, commandPositionInAST);

    const removedColumns: string[] = [];

    for (const command of previousCommands) {
      // Collect dropped columns
      if (command.name.toLowerCase() === 'drop') {
        walk(command, {
          visitColumn: (node) => {
            removedColumns.push(node.parts.join('.'));
          },
        });
      }

      // Collect renamed columns
      const commandDef = esqlCommandRegistry.getCommandByName(command.name);
      if (commandDef?.methods.summary) {
        const { renamedColumnsPairs } = commandDef?.methods.summary(command, '');
        if (renamedColumnsPairs) {
          renamedColumnsPairs.forEach(([_renameTo, renameFrom]) => {
            removedColumns.push(renameFrom);
          });
        }
      }
    }

    return removedColumns.includes(this.column.name);
  }
}
