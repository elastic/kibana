/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type ESQLAstCommand, LeafPrinter } from '@kbn/esql-ast';
import { uniqBy } from 'lodash';
import { isColumnItem, isOptionItem } from '../../../..';
import type { ESQLFieldWithMetadata } from '../../../validation/types';

export const fieldsSuggestionsAfter = (
  command: ESQLAstCommand,
  previousCommandFields: ESQLFieldWithMetadata[],
  userDefinedColumns: ESQLFieldWithMetadata[]
): ESQLFieldWithMetadata[] => {
  const asOption = command.args.find((arg) => isOptionItem(arg) && arg.name === 'as');
  const targetArgument = asOption && isOptionItem(asOption) ? asOption.args[0] : undefined;
  const target = targetArgument && isColumnItem(targetArgument) ? targetArgument : undefined;

  return uniqBy(
    [
      ...previousCommandFields,
      {
        name: target ? LeafPrinter.column(target) : 'completion',
        type: 'keyword',
      },
    ],
    'name'
  );
};
