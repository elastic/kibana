/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Parser,
  isAssignment,
  isColumn,
  isFunctionExpression,
  type ESQLCommand,
  type ESQLColumn,
} from '@kbn/esql-ast';

export interface UserDefinedColumnsPerCommand {
  [commandIndex: number]: string[];
}

/**
 * Extracts user-defined columns from an ES|QL query.
 * User-defined columns are columns created by the query itself, not existing in the source data.
 *
 * Examples of user-defined columns:
 * - EVAL col = ABS(x) -> "col" is user-defined (created with = assignment)
 * - RENAME AvgTicketPrice AS ticketPrice -> "ticketPrice" is user-defined (created with AS rename)
 * - STATS count = count(), avg_price = avg(price) BY category -> "count" and "avg_price" are user-defined
 *
 * @param query The ES|QL query string to parse
 * @returns Object mapping command indices to arrays of user-defined columns
 */
export function getUserDefinedColumns(query: string): UserDefinedColumnsPerCommand {
  const { root } = Parser.parse(query);
  const result: UserDefinedColumnsPerCommand = {};

  root.commands.forEach((command, commandIndex) => {
    const userDefinedColumns = getUserDefinedColumnsFromCommand(command);
    if (userDefinedColumns.length > 0) {
      result[commandIndex] = userDefinedColumns;
    }
  });

  return result;
}

/**
 * Extracts user-defined columns from a single command by looking for:
 * 1. Assignment operators (=) - creates new columns
 * 2. Rename operators (AS) - creates aliases
 */
function getUserDefinedColumnsFromCommand(command: ESQLCommand): string[] {
  const userDefinedColumns: string[] = [];

  const processArgument = (arg: any) => {
    // Handle assignment (=) - creates new columns in EVAL, STATS etc.
    if (isAssignment(arg) && isColumn(arg.args[0])) {
      const leftColumn = arg.args[0] as ESQLColumn;

      userDefinedColumns.push(leftColumn.name);
    }

    // Handle rename (AS)
    else if (isFunctionExpression(arg) && arg.name === 'as') {
      if (arg.args.length >= 2 && isColumn(arg.args[0]) && isColumn(arg.args[1])) {
        const newNameCol = arg.args[1] as ESQLColumn;

        userDefinedColumns.push(newNameCol.name);
      }
    }

    // Handle standalone function calls that automatically create columns (e.g., STATS count())
    // Only consider variadic-call functions, not binary expressions (operators like >, =, etc.)
    else if (
      isFunctionExpression(arg) &&
      arg.subtype === 'variadic-call' &&
      arg.text &&
      arg.name !== 'as'
    ) {
      // Use the text representation (e.g., "count()") as the column name
      userDefinedColumns.push(arg.text);
    }

    // Handle option arguments (like BY clauses) that can contain assignments
    else if (arg.type === 'option' && arg.args) {
      arg.args.forEach(processArgument);
    }
  };

  command.args.forEach(processArgument);

  return userDefinedColumns;
}

/**
 * Gets all user-defined column names from a query (flattened list)
 * @param query The ES|QL query string
 * @returns Array of user-defined column names
 */
export function getAllUserDefinedColumnNames(query: string): string[] {
  const columnsPerCommand = getUserDefinedColumns(query);
  const allColumns: string[] = [];

  Object.values(columnsPerCommand).forEach((columns: string[]) => {
    columns.forEach((col: string) => allColumns.push(col));
  });

  return [...new Set(allColumns)]; // Remove duplicates
}

/**
 * Checks if a specific column name is user-defined in the query
 * @param query The ES|QL query string
 * @param columnName The column name to check
 * @returns true if the column is user-defined, false otherwise
 */
export function isUserDefinedColumn(query: string, columnName: string): boolean {
  return getAllUserDefinedColumnNames(query).includes(columnName);
}
