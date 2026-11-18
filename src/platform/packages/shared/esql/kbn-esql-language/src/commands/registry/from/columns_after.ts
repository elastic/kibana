/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { uniqBy } from 'lodash';
import { isOptionNode, isSource, isSubQuery } from '@elastic/esql';
import type { ESQLCommand, ESQLAstQueryExpression, ESQLSource } from '@elastic/esql/types';
import {
  findNamedSubqueryForSource,
  getNamedSubqueriesAvailableTo,
  type NamedSubquery,
} from '../../definitions/utils/named_subqueries';
import { isTimeseriesSourceCommand } from '../../definitions/utils/timeseries_check';
import { esqlCommandRegistry } from '..';
import { getMetadataColumns } from '../options/metadata';
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

  const results = await Promise.all(promises);
  const columns = results.flat();

  // Without indices to ask, METADATA columns get the static types Elasticsearch gives them.
  if (sources.length === 0) {
    columns.push(...getMetadataColumns(metadataOptions));
  }

  return uniqBy(columns, 'name');
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
