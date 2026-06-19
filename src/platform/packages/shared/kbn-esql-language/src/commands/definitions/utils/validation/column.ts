/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLColumn, ESQLIdentifier } from '@elastic/esql/types';
import { isParametrized } from '@elastic/esql';
import { UnmappedFieldsStrategy, type ICommandContext } from '../../../registry/types';
import { errors } from '../errors';
import { getColumnExists, getColumnName } from '../columns';
import type { ESQLMessage } from '../../types';

interface ColumnValidationOptions {
  skipUnsupportedOrConflictingFieldValidation?: boolean;
}

export function validateColumnForCommand(
  column: ESQLColumn | ESQLIdentifier,
  commandName: string,
  context: ICommandContext,
  options?: ColumnValidationOptions
): ESQLMessage[] {
  return new ColumnValidator(column, context, commandName, options).validate();
}

export class ColumnValidator {
  constructor(
    private readonly column: ESQLColumn | ESQLIdentifier,
    private readonly context: ICommandContext,
    private readonly commandName: string,
    private readonly options: ColumnValidationOptions = {}
  ) {}

  validate(): ESQLMessage[] {
    if (!this.exists || this.isPreviouslyUsedUnmappedColumn) {
      if (this.isUnmappedColumnAllowed) {
        return [errors.unmappedColumnWarning(this.column)];
      } else {
        return [errors.unknownColumn(this.column)];
      }
    }

    if (!this.options.skipUnsupportedOrConflictingFieldValidation) {
      const columnName = getColumnName(this.column);
      const column = this.context.columns.get(columnName);

      if (column && !column.userDefined && column.type === 'unsupported') {
        if (column.hasConflict) {
          return [
            errors.fieldTypeConflict(
              this.column,
              columnName,
              column.originalTypes,
              this.shouldWarnForUnsupportedOrConflictingField
            ),
          ];
        }

        return [
          errors.unsupportedFieldType(
            this.column,
            columnName,
            this.shouldWarnForUnsupportedOrConflictingField
          ),
        ];
      }
    }

    return [];
  }

  private get exists(): boolean {
    if (
      this.column.text.length > 0 &&
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

  private get isPreviouslyUsedUnmappedColumn(): boolean {
    const columnName = getColumnName(this.column);
    const column = this.context.columns.get(columnName);
    return Boolean(column && column.isUnmappedField);
  }

  private get shouldWarnForUnsupportedOrConflictingField(): boolean {
    return this.commandName === 'keep' || this.commandName === 'drop';
  }
}
