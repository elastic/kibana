/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLColumn, ESQLIdentifier, ESQLMessage } from '../../../../types';
import { UnmappedFieldsStrategy, type ICommandContext } from '../../../registry/types';
import { errors } from '../errors';
import { getColumnExists } from '../columns';
import { isParametrized } from '../../../../ast/is';

export function validateColumnForCommand(
  column: ESQLColumn | ESQLIdentifier,
  commandName: string,
  context: ICommandContext
): ESQLMessage[] {
  return new ColumnValidator(column, context, commandName).validate();
}

export class ColumnValidator {
  constructor(
    private readonly column: ESQLColumn | ESQLIdentifier,
    private readonly context: ICommandContext,
    private readonly commandName: string
  ) {}

  validate(): ESQLMessage[] {
    if (!this.exists) {
      if (this.isUnmappedColumnAllowed) {
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
}
