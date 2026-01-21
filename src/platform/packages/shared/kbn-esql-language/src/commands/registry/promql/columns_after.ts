/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand, ESQLAstPromqlCommand, ESQLMapEntry } from '../../../types';
import type { ESQLColumnData, ESQLUserDefinedColumn } from '../types';
import type { IAdditionalFields } from '../registry';
import { isBinaryExpression, isIdentifier, isSource } from '../../../ast/is';
import { synth } from '../../../..';

export const columnsAfter = async (
  command: ESQLCommand,
  _previousColumns: ESQLColumnData[],
  _query: string,
  { fromFrom }: IAdditionalFields
): Promise<ESQLColumnData[]> => {
  const promqlCommand = command as ESQLAstPromqlCommand;
  const sourceColumns = await getSourceColumns(promqlCommand, fromFrom);
  const userDefinedColumn = getUserDefinedColumn(promqlCommand);

  return userDefinedColumn ? [...sourceColumns, userDefinedColumn] : sourceColumns;
};

async function getSourceColumns(
  command: ESQLAstPromqlCommand,
  fromFrom: IAdditionalFields['fromFrom']
): Promise<ESQLColumnData[]> {
  const indexName = getIndexFromParams(command);

  if (!indexName) {
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

function getIndexFromParams({ params }: ESQLAstPromqlCommand): string | undefined {
  if (!params?.entries) {
    return undefined;
  }

  const indexEntry = params.entries.find(
    (entry): entry is ESQLMapEntry =>
      isIdentifier(entry.key) && entry.key.name.toLowerCase() === 'index'
  );

  const { value } = indexEntry ?? {};

  return isIdentifier(value) || isSource(value) ? value.name : undefined;
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
