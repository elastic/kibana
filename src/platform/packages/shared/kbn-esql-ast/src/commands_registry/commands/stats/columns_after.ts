/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import uniqBy from 'lodash/uniqBy';
import type { ESQLCommand } from '../../../types';
import { walk } from '../../../walker';
import type { ESQLFieldWithMetadata, ESQLUserDefinedColumn } from '../../types';
import { ICommandContext } from '../../types';
import { FieldType } from '../../../definitions/types';
import { isColumn } from '../../../ast/is';

function transformMapToESQLFields(
  inputMap: Map<string, ESQLUserDefinedColumn[]>
): ESQLFieldWithMetadata[] {
  const esqlFields: ESQLFieldWithMetadata[] = [];

  for (const [, userDefinedColumns] of inputMap) {
    for (const userDefinedColumn of userDefinedColumns) {
      // Only include userDefinedColumns that have a known type
      if (userDefinedColumn.type) {
        esqlFields.push({
          name: userDefinedColumn.name,
          type: userDefinedColumn.type as FieldType,
        });
      }
    }
  }

  return esqlFields;
}

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLFieldWithMetadata[],
  context?: ICommandContext
) => {
  const columns: string[] = [];
  const userDefinedColumns =
    context?.userDefinedColumns ?? new Map<string, ESQLUserDefinedColumn[]>();

  walk(command, {
    visitCommandOption: (node) => {
      const args = node.args.filter(isColumn);
      const breakdownColumns = args.map((arg) => arg.name);
      columns.push(...breakdownColumns);
    },
  });

  const columnsToKeep = previousColumns.filter((field) => {
    return columns.some((column) => column === field.name);
  });

  const arrayOfUserDefinedColumns: ESQLFieldWithMetadata[] =
    transformMapToESQLFields(userDefinedColumns);

  return uniqBy([...columnsToKeep, ...arrayOfUserDefinedColumns], 'name');
};
