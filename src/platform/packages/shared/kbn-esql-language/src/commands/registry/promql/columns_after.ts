/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand, ESQLAstPromqlCommand } from '../../../types';
import type { ESQLColumnData, ESQLUserDefinedColumn } from '../types';
import type { IAdditionalFields } from '../registry';
import { isBinaryExpression, isIdentifier } from '../../../ast/is';
import { PromqlParamName } from './utils';

export const columnsAfter = async (
  command: ESQLCommand,
  _previousColumns: ESQLColumnData[],
  _query: string,
  { fromPromql }: IAdditionalFields
): Promise<ESQLColumnData[]> => {
  const promqlCommand = command as ESQLAstPromqlCommand;
  const sourceColumns = fromPromql ? await fromPromql(promqlCommand) : [];
  const userDefinedColumn = getUserDefinedColumn(promqlCommand);
  const stepColumn = getStepColumn(promqlCommand);

  const columns: ESQLColumnData[] = [...sourceColumns];

  if (stepColumn) {
    columns.push(stepColumn);
  }

  if (userDefinedColumn) {
    columns.push(userDefinedColumn);
  }

  return columns;
};

function getUserDefinedColumn(command: ESQLAstPromqlCommand): ESQLUserDefinedColumn | undefined {
  const { query } = command;

  if (!isBinaryExpression(query) || query.name !== '=') {
    return undefined;
  }

  // Grammar: valueName is always UNQUOTED_IDENTIFIER | QUOTED_IDENTIFIER
  const target = query.args[0];
  if (!isIdentifier(target)) {
    return undefined;
  }

  return {
    name: target.name,
    type: 'unknown', // TODO: infer type once PROMQL query AST is available
    location: target.location,
    userDefined: true,
  };
}

function getStepColumn(command: ESQLAstPromqlCommand): ESQLColumnData | undefined {
  const hasStep = command.params?.entries?.some(
    ({ key }) => isIdentifier(key) && key.name.toLowerCase() === PromqlParamName.Step
  );

  if (!hasStep) {
    return undefined;
  }

  return {
    name: PromqlParamName.Step,
    type: 'date',
    userDefined: false,
  };
}
