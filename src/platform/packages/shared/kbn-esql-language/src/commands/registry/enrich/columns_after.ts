/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { uniqBy } from 'lodash';
import { isAssignment, isColumn, isOptionNode } from '../../../ast/is';
import type { ESQLCommandOption } from '../../../types';
import { type ESQLCommand } from '../../../types';
import type { ESQLColumnData } from '../types';
import type { IAdditionalFields } from '../registry';

export const columnsAfter = async (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  query: string,
  additionalFields: IAdditionalFields
) => {
  const enrichFields = await additionalFields.fromEnrich(command);
  let fieldsToAdd = enrichFields;

  // the with option scopes down the fields that are added
  // and potentially renames things
  const withOption = command.args.find((arg) => isOptionNode(arg) && arg.name === 'with') as
    | ESQLCommandOption
    | undefined;
  if (withOption) {
    const declaredFieldEntries = withOption.args
      .map((arg) => {
        if (
          isAssignment(arg) &&
          isColumn(arg.args[0]) &&
          Array.isArray(arg.args[1]) &&
          isColumn(arg.args[1][0])
        ) {
          return [arg.args[1][0].parts.join('.'), arg.args[0].parts.join('.')];
        }
        return undefined;
      })
      .filter(Boolean) as [string, string][];

    const declaredFields = new Map<string, string>(declaredFieldEntries);

    fieldsToAdd = enrichFields
      .filter((field) => declaredFields.has(field.name))
      .map((field) => {
        const newName = declaredFields.get(field.name)!;
        return { ...field, name: newName };
      });
  }

  return uniqBy([...fieldsToAdd, ...previousColumns], 'name');
};
