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
import { Walker } from '../../../ast/walker';
import { findPipeOutsideQuotes } from '../../definitions/utils/shared';
import { PromqlParamName } from './utils';

export const columnsAfter = async (
  command: ESQLCommand,
  _previousColumns: ESQLColumnData[],
  query: string,
  { fromPromql }: IAdditionalFields
): Promise<ESQLColumnData[]> => {
  const promqlCommand = command as ESQLAstPromqlCommand;
  const pipeIndex = findPipeOutsideQuotes(query, promqlCommand.location.min);
  const sourceColumns = fromPromql ? await fromPromql(promqlCommand) : [];
  const userDefinedColumn = getUserDefinedColumn(promqlCommand);
  const stepColumn = getStepColumn(promqlCommand);

  if (pipeIndex === -1) {
    return sourceColumns;
  }

  const { metrics, breakdownLabels } = getPromqlOutputColumns(promqlCommand, {
    excludeMetrics: !!userDefinedColumn,
  });

  const sourceByName = new Map(sourceColumns.map((column) => [column.name, column]));

  return buildColumns({
    stepColumn,
    userDefinedColumn,
    sourceByName,
    metrics,
    breakdownLabels,
  });
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
    type: 'unknown', // TODO: infer type once PROMQL query AST is available,
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

function getPromqlOutputColumns(
  command: ESQLAstPromqlCommand,
  { excludeMetrics }: { excludeMetrics: boolean }
): {
  metrics: Set<string>;
  breakdownLabels: Set<string>;
} {
  const metrics = new Set<string>();
  const breakdownLabels = new Set<string>();
  let expressionType: string | undefined;

  Walker.walk(command, {
    promql: {
      visitPromqlQuery: (node) => {
        expressionType ??= node.expression?.type;
      },
      visitPromqlSelector: (node) => {
        if (node.metric?.name) {
          metrics.add(node.metric.name);
        }
      },
      visitPromqlFunction: (node) => {
        if (node.grouping) {
          for (const label of node.grouping.args) {
            if (label.name) {
              breakdownLabels.add(label.name);
            }
          }
        }
      },
    },
  });

  const includeMetrics = expressionType === 'selector' && !excludeMetrics;

  if (!includeMetrics) {
    return { metrics: new Set(), breakdownLabels };
  }

  return { metrics, breakdownLabels };
}

function buildColumns({
  stepColumn,
  userDefinedColumn,
  sourceByName,
  metrics,
  breakdownLabels,
}: {
  stepColumn: ESQLColumnData | undefined;
  userDefinedColumn: ESQLUserDefinedColumn | undefined;
  sourceByName: Map<string, ESQLColumnData>;
  metrics: Set<string>;
  breakdownLabels: Set<string>;
}): ESQLColumnData[] {
  const columnNames = new Set<string>();
  let columns: ESQLColumnData[] = [];

  columns = appendColumn(columns, columnNames, stepColumn);
  columns = appendColumn(columns, columnNames, userDefinedColumn);
  columns = appendPromqlFields(columns, columnNames, sourceByName, metrics);
  columns = appendPromqlFields(columns, columnNames, sourceByName, breakdownLabels);

  return columns;
}

function appendPromqlFields(
  columns: ESQLColumnData[],
  columnNames: Set<string>,
  sourceByName: Map<string, ESQLColumnData>,
  names: Set<string>
): ESQLColumnData[] {
  let nextColumns = columns;

  for (const name of names) {
    const sourceColumn = sourceByName.get(name);
    nextColumns = appendColumn(nextColumns, columnNames, {
      name,
      type: sourceColumn?.type ?? 'unknown',
      userDefined: false,
    });
  }

  return nextColumns;
}

function appendColumn(
  columns: ESQLColumnData[],
  columnNames: Set<string>,
  column: ESQLColumnData | undefined
): ESQLColumnData[] {
  if (!column || columnNames.has(column.name)) {
    return columns;
  }

  columnNames.add(column.name);
  return [...columns, column];
}
