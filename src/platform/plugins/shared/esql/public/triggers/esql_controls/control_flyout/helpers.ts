/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { monaco } from '@kbn/monaco';
import { inKnownTimeInterval } from '@kbn/esql-validation-autocomplete';
import { type ESQLColumn, parse, walk, mutate, BasicPrettyPrinter, Walker } from '@kbn/esql-ast';

export const updateQueryStringWithVariable = (
  queryString: string,
  variable: string,
  cursorPosition: monaco.Position
) => {
  const variableName = `?${variable}`;
  const cursorColumn = cursorPosition?.column ?? 0;
  const cursorLine = cursorPosition?.lineNumber ?? 0;
  const lines = queryString.split('\n');

  if (lines.length > 1) {
    const queryArray = queryString.split('\n');
    const queryPartToBeUpdated = queryArray[cursorLine - 1];
    const queryWithVariable = [
      queryPartToBeUpdated.slice(0, cursorColumn - 1),
      variableName,
      queryPartToBeUpdated.slice(cursorColumn - 1),
    ].join('');
    queryArray[cursorLine - 1] = queryWithVariable;
    return queryArray.join('\n');
  }

  return [
    queryString.slice(0, cursorColumn - 1),
    variableName,
    queryString.slice(cursorColumn - 1),
  ].join('');
};

export const getQueryForFields = (queryString: string, cursorPosition?: monaco.Position) => {
  const cursorColumn = cursorPosition?.column ?? 0;
  const cursorLine = cursorPosition?.lineNumber ?? 0;
  const lines = queryString.split('\n');

  if (lines.length > 1) {
    const queryArray = queryString.split('\n');
    const lineToBeUpdated = cursorLine - 1;
    return queryArray.slice(0, lineToBeUpdated).join('\n');
  }
  const queryBefore = queryString.slice(0, cursorColumn - 1);
  const pipes = queryBefore.split('|');
  return pipes.slice(0, pipes.length - 1).join('|');
};

export const areValuesIntervalsValid = (values: string[]) => {
  return values.every((value) => {
    // remove digits and empty spaces from the string to get the unit
    const unit = value.replace(/[0-9]/g, '').replace(/\s/g, '');
    return inKnownTimeInterval(unit);
  });
};

export const getRecurrentVariableName = (name: string, existingNames: string[]) => {
  let newName = name;
  let i = 1;
  while (existingNames.includes(newName)) {
    newName = `${name}${i}`;
    i++;
  }
  return newName;
};

export const getValuesFromQueryField = (queryString: string) => {
  const validQuery = `${queryString} ""`;
  const { root } = parse(validQuery);
  const lastCommand = root.commands[root.commands.length - 1];
  const columns: ESQLColumn[] = [];

  walk(lastCommand, {
    visitColumn: (node) => columns.push(node),
  });

  const column = Walker.match(lastCommand, { type: 'column' });

  if (column) {
    return `${column.name}`;
  }
};

export const getFlyoutStyling = () => {
  return `
          .euiFlyoutBody__overflow {
            -webkit-mask-image: none;
            padding-left: inherit;
            margin-left: inherit;
            transform: initial;
          }
          .euiFlyoutBody__overflowContent {
            block-size: 100%;
          }
  `;
};

export const appendStatsByToQuery = (queryString: string, column: string) => {
  const { root } = parse(queryString);
  const lastCommand = root.commands[root.commands.length - 1];
  if (lastCommand.name === 'stats') {
    const statsCommand = lastCommand;
    mutate.generic.commands.remove(root, statsCommand);
    const queryWithoutStats = BasicPrettyPrinter.print(root);
    return `${queryWithoutStats}\n| STATS BY ${column}`;
  } else {
    return `${queryString}\n| STATS BY ${column}`;
  }
};

export const validateVariableName = (variableName: string) => {
  let text = variableName
    // variable name can only contain letters, numbers and underscores
    .replace(/[^a-zA-Z0-9_]/g, '');
  if (text.charAt(0) === '_') {
    text = text.substring(1);
  }

  return text;
};
