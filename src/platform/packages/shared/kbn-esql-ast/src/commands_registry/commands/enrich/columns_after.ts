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
import type { ESQLColumnData } from '../../types';
import type { IAdditionalFields } from '../../registry';

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  query: string,
  newFields: IAdditionalFields
) => {
  const enrichFields = newFields.fromEnrich ?? [];
  let fieldsToAdd = enrichFields;

  // the with option scopes down the fields that are added
  const withOption = command.args.find((arg) => isOptionNode(arg) && arg.name === 'with') as
    | ESQLCommandOption
    | undefined;
  if (withOption) {
    const declaredFields = withOption.args
      .map((arg) => isAssignment(arg) && isColumn(arg.args[0]) && arg.args[0].parts.join('.'))
      .filter(Boolean) as string[];
    fieldsToAdd = enrichFields.filter((field) => declaredFields.includes(field.name));
  }

  return uniqBy([...fieldsToAdd, ...previousColumns], 'name');
};
