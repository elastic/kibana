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
import { getIndexFromPromQLParams } from '../../definitions/utils/promql';
import { synth } from '../../../..';
import { PromqlParamName } from './utils';

export const columnsAfter = async (
  command: ESQLCommand,
  _previousColumns: ESQLColumnData[],
  _query: string,
  { fromFrom, fromProql: getDefaultPromqlIndexes }: IAdditionalFields
): Promise<ESQLColumnData[]> => {
  const promqlCommand = command as ESQLAstPromqlCommand;
  const sourceColumns = await getSourceColumns(promqlCommand, fromFrom, getDefaultPromqlIndexes);
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

async function getSourceColumns(
  command: ESQLAstPromqlCommand,
  fromFrom: IAdditionalFields['fromFrom'],
  getDefaultPromqlIndexes: IAdditionalFields['fromProql']
): Promise<ESQLColumnData[]> {
  const indexName = getIndexFromPromQLParams(command);

  if (!indexName) {
    if (getDefaultPromqlIndexes) {
      const { indices } = await getDefaultPromqlIndexes();
      const indexNames = indices.map(({ name }) => name);

      if (indexNames.length > 0) {
        return fromFrom(synth.cmd`FROM ${indexNames.join(',')}`);
      }
    }

    return [];
  }

  /*
   * PROMQL stores the index in params, not as a source arg like FROM/TS:
   *   FROM metrics  → args: [{ type: "source", name: "metrics" }]
   *   PROMQL index=metrics → params.entries: [{ key: "index", value: "metrics" }]
   *
   * We create a synthetic FROM command to reuse the existing field fetching infrastructure.
   */
  return fromFrom(synth.cmd`FROM ${indexName}`);
}

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
