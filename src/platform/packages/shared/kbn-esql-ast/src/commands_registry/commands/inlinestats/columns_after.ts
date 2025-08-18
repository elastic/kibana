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
import type { ESQLFieldWithMetadata, ESQLUserDefinedColumn } from '../../types';
import type { ICommandContext } from '../../types';
import type { FieldType } from '../../../definitions/types';

function transformMapToESQLFields(
  inputMap: Map<string, ESQLUserDefinedColumn[]>
): ESQLFieldWithMetadata[] {
  const esqlFields: ESQLFieldWithMetadata[] = [];

  for (const [, userDefinedColumns] of inputMap) {
    for (const userDefinedColumn of userDefinedColumns) {
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
  _command: ESQLCommand,
  previousColumns: ESQLFieldWithMetadata[],
  context?: ICommandContext
) => {
  const userDefinedColumns =
    context?.userDefinedColumns ?? new Map<string, ESQLUserDefinedColumn[]>();

  const arrayOfUserDefinedColumns: ESQLFieldWithMetadata[] =
    transformMapToESQLFields(userDefinedColumns);

  return uniqBy([...previousColumns, ...arrayOfUserDefinedColumns], 'name');
};
