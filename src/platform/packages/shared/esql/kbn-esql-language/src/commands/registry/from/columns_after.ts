/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { uniqBy } from 'lodash';
import { isColumn, isOptionNode, isSource, isSubQuery } from '@elastic/esql';
import type {
  ESQLCommand,
  ESQLAstQueryExpression,
  ESQLCommandOption,
  ESQLSource,
} from '@elastic/esql/types';
import {
  findNamedSubqueryForSource,
  getNamedSubqueriesAvailableTo,
  resolveNamedSubquerySources,
  type NamedSubquery,
} from '../../definitions/utils/named_subqueries';
import { matchesWildcardPattern } from '../../definitions/utils/regex';
import { isTimeseriesSourceCommand } from '../../definitions/utils/timeseries_check';
import { esqlCommandRegistry } from '..';
import type { ESQLColumnData } from '../types';
import { UnmappedFieldsStrategy } from '../types';
import type { IAdditionalFields } from '../registry';

export const columnsAfter = async (
  command: ESQLCommand,
  _previousColumns: ESQLColumnData[], // will always be empty for FROM
  query: string,
  additionalFields: IAdditionalFields,
  unmappedFieldsStrategy: UnmappedFieldsStrategy = UnmappedFieldsStrategy.DEFAULT
): Promise<ESQLColumnData[]> => {
  const metadataOptions = command.args
    .filter(isOptionNode)
    .filter(({ name }) => name === 'metadata');
  const subqueries = command.args.filter(isSubQuery);
  const namedSubqueries = additionalFields.namedSubqueries ?? [];
  const namedSubqueryColumns =
    additionalFields.namedSubqueryColumns ?? new Map<NamedSubquery, Promise<ESQLColumnData[]>>();
  const memoizedFields = { ...additionalFields, namedSubqueryColumns };
  const sources: ESQLSource[] = [];
  const referencedNamedSubqueries: NamedSubquery[] = [];

  for (const source of command.args.filter(isSource)) {
    const namedSubquery = findNamedSubqueryForSource(source, namedSubqueries);

    if (namedSubquery) {
      referencedNamedSubqueries.push(namedSubquery);
    } else {
      sources.push(source);
    }
  }

  const promises: Array<Promise<ESQLColumnData[]>> = [];

  // Batch all plain sources into a single FROM s1, s2, ... request instead of N individual
  // ones. ES returns the column-union in one round-trip, which is identical to merging N results.
  if (sources.length > 0) {
    promises.push(
      additionalFields.fromFrom({ ...command, args: [...sources, ...metadataOptions] })
    );
  }

  for (const subquery of subqueries) {
    promises.push(processSubquery(subquery.child, query, memoizedFields, unmappedFieldsStrategy));
  }

  // For each LET used in FROM, compute its body's output columns using only previously declared LET bindings.
  for (const namedSubquery of referencedNamedSubqueries) {
    promises.push(
      getNamedSubqueryColumns(namedSubquery, query, memoizedFields, unmappedFieldsStrategy)
    );
  }

  const metadataNeedsNamedSubquerySources =
    sources.length === 0 && referencedNamedSubqueries.length > 0;

  if (metadataNeedsNamedSubquerySources) {
    promises.push(
      getOuterMetadataColumns(command, metadataOptions, namedSubqueries, additionalFields.fromFrom)
    );
  }

  const results = await Promise.all(promises);
  return uniqBy(results.flat(), 'name');
};

const getNamedSubqueryColumns = (
  namedSubquery: NamedSubquery,
  query: string,
  additionalFields: IAdditionalFields & Required<Pick<IAdditionalFields, 'namedSubqueryColumns'>>,
  unmappedFieldsStrategy: UnmappedFieldsStrategy
): Promise<ESQLColumnData[]> => {
  const { namedSubqueries = [], namedSubqueryColumns } = additionalFields;
  const cachedColumns = namedSubqueryColumns.get(namedSubquery);

  if (cachedColumns) {
    return cachedColumns;
  }

  const namedSubqueryFields = {
    ...additionalFields,
    namedSubqueries: getNamedSubqueriesAvailableTo(namedSubqueries, namedSubquery),
  };
  const columns = processSubquery(
    namedSubquery.query,
    query,
    namedSubqueryFields,
    unmappedFieldsStrategy
  );

  namedSubqueryColumns.set(namedSubquery, columns);

  return columns;
};

// Fetch metadata requested outside the LET from its underlying indices,
// so it can be added to the LET's output without changing its pipeline.
const getOuterMetadataColumns = async (
  command: ESQLCommand,
  metadataOptions: ESQLCommandOption[],
  namedSubqueries: readonly NamedSubquery[],
  fromFrom: IAdditionalFields['fromFrom']
): Promise<ESQLColumnData[]> => {
  if (metadataOptions.length === 0) {
    return [];
  }

  const sources = resolveNamedSubquerySources(command, namedSubqueries);

  if (sources.length === 0) {
    return [];
  }

  const metadataPatterns = metadataOptions.flatMap(({ args }) =>
    args.filter(isColumn).map(({ name }) => name)
  );
  const fields = await fromFrom({ ...command, args: [...sources, ...metadataOptions] });

  return fields.filter(({ name }) =>
    metadataPatterns.some((pattern) => matchesWildcardPattern(pattern, name))
  );
};

async function processSubquery(
  subquery: ESQLAstQueryExpression,
  query: string,
  additionalFields: IAdditionalFields,
  unmappedFieldsStrategy: UnmappedFieldsStrategy
): Promise<ESQLColumnData[]> {
  let columns: ESQLColumnData[] = [];
  const subqueryFields = {
    ...additionalFields,
    isTimeseriesSource: isTimeseriesSourceCommand(subquery.commands),
  };

  // Execute each command in subquery pipeline: FROM index | KEEP
  for (const subCommand of subquery.commands) {
    const commandDef = esqlCommandRegistry.getCommandByName(subCommand.name);

    if (commandDef?.methods?.columnsAfter) {
      columns = await commandDef.methods.columnsAfter(
        subCommand,
        columns,
        query,
        subqueryFields,
        unmappedFieldsStrategy
      );
    }
  }

  return columns;
}
