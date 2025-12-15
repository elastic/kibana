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
  esqlCommandRegistry,
  type ESQLCommand,
  type ESQLColumn,
  isOptionNode,
  isProperNode,
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
export async function getUserDefinedColumns(query: string): Promise<UserDefinedColumnsPerCommand> {
  const { root } = Parser.parse(query);
  const result: UserDefinedColumnsPerCommand = {};

  await Promise.all(
    root.commands.map(async (command, commandIndex) => {
      const userDefinedColumns = await getUserDefinedColumnsFromCommand(command, query);
      if (userDefinedColumns.length > 0) {
        result[commandIndex] = userDefinedColumns;
      }
    })
  );

  return result;
}

/**
 * Extracts user-defined columns from a single command by looking for:
 * 1. Assignment operators (=) - creates new columns
 * 2. Rename operators (AS) - creates aliases
 * 3. Function calls that automatically create columns (e.g., STATS count())
 * 4. Columns that are being added by ES (e.g. in dissect command)
 */
async function getUserDefinedColumnsFromCommand(
  command: ESQLCommand,
  query: string
): Promise<string[]> {
  const userDefinedColumns: string[] = [];
  const columnsInOptions: Set<string> = new Set(); // Track columns mentioned in option nodes (like BY clauses)

  // Manual parsing to detect user-defined columns
  const processArgument = async (arg: unknown) => {
    // Handle assignment (=)
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
    else if (
      isFunctionExpression(arg) &&
      arg.subtype === 'variadic-call' &&
      arg.text &&
      arg.name !== 'as'
    ) {
      userDefinedColumns.push(arg.text);
    }

    // Handle option arguments (like BY clauses) that can contain assignments
    else if (isProperNode(arg) && isOptionNode(arg)) {
      // Special case: AS option creates new column names (like in CHANGE_POINT)
      if (arg.name === 'as') {
        arg.args.forEach((optionArg) => {
          if (isColumn(optionArg)) {
            userDefinedColumns.push(optionArg.name);
          }
        });
      } else {
        // For other options (like BY clauses), collect column names for filtering
        arg.args.forEach((optionArg) => {
          if (isColumn(optionArg)) {
            columnsInOptions.add(optionArg.name);
          }
        });
        await Promise.all(arg.args.map(processArgument));
      }
    }
  };

  await Promise.all(command.args.map(processArgument));

  // Get additional user-defined columns from the command's columnsAfter method, if it exists
  const commandDef = esqlCommandRegistry.getCommandByName(command.name);
  if (commandDef?.methods.columnsAfter) {
    try {
      const esColumns = await commandDef.methods.columnsAfter(command, [], query);
      esColumns.forEach((col) => {
        if (col && col.name) {
          if (!columnsInOptions.has(col.name)) {
            userDefinedColumns.push(col.name);
          }
        }
      });
    } catch (error) {
      // Ignore errors from columnsAfter
    }
  }

  return [...new Set(userDefinedColumns)];
}

/**
 * Gets all user-defined column names from a query (flattened list)
 * @param query The ES|QL query string
 * @returns Array of user-defined column names
 */
export async function getAllUserDefinedColumnNames(query: string): Promise<string[]> {
  const columnsPerCommand = await getUserDefinedColumns(query);
  const allColumns: string[] = [];

  Object.values(columnsPerCommand).forEach((columns: string[]) => {
    columns.forEach((col: string) => allColumns.push(col));
  });

  return [...new Set(allColumns)];
}

/**
 * Checks if a specific column name is user-defined in the query
 * @param query The ES|QL query string
 * @param columnName The column name to check
 * @returns true if the column is user-defined, false otherwise
 */
export async function isUserDefinedColumn(query: string, columnName: string): Promise<boolean> {
  const allColumnNames = await getAllUserDefinedColumnNames(query);
  return allColumnNames.includes(columnName);
}
