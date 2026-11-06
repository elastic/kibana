/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand, ESQLAstRegisteredDomainCommand } from '@elastic/esql/types';
import { Commands } from '../../definitions/keywords';
import {
  buildPrefixedColumns,
  getColumnName,
  getCommandOutputColumns,
} from '../../definitions/utils/columns';
import type { ESQLColumnData } from '../types';

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[]
): ESQLColumnData[] => {
  const { targetField } = command as ESQLAstRegisteredDomainCommand;
  const output = getCommandOutputColumns(Commands.REGISTERED_DOMAIN);

  if (!targetField || !output) {
    return previousColumns;
  }

  return [...previousColumns, ...buildPrefixedColumns(getColumnName(targetField), output)];
};
