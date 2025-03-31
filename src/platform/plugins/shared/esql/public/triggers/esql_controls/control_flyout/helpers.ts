/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { monaco } from '@kbn/monaco';
import { ESQLVariableType } from '@kbn/esql-types';
import { timeUnits } from '@kbn/esql-validation-autocomplete';

function inKnownTimeInterval(timeIntervalUnit: string): boolean {
  return timeUnits.some((unit) => unit === timeIntervalUnit.toLowerCase());
}

export const updateQueryStringWithVariable = (
  queryString: string,
  variable: string,
  cursorPosition: monaco.Position
) => {
  const cursorColumn = cursorPosition?.column ?? 0;
  const cursorLine = cursorPosition?.lineNumber ?? 0;
  const lines = queryString.split('\n');

  if (lines.length > 1) {
    const queryArray = queryString.split('\n');
    const queryPartToBeUpdated = queryArray[cursorLine - 1];
    const queryWithVariable = [
      queryPartToBeUpdated.slice(0, cursorColumn - 1),
      variable,
      queryPartToBeUpdated.slice(cursorColumn - 1),
    ].join('');
    queryArray[cursorLine - 1] = queryWithVariable;
    return queryArray.join('\n');
  }

  return [
    queryString.slice(0, cursorColumn - 1),
    variable,
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

export const getVariablePrefix = (variableType: ESQLVariableType) => {
  switch (variableType) {
    case ESQLVariableType.FIELDS:
      return 'field';
    case ESQLVariableType.FUNCTIONS:
      return 'function';
    case ESQLVariableType.TIME_LITERAL:
      return 'interval';
    default:
      return 'variable';
  }
};

export const getRecurrentVariableName = (name: string, existingNames: Set<string>) => {
  let newName = name;
  let i = 1;
  while (existingNames.has(newName)) {
    newName = `${name}${i}`;
    i++;
  }
  return newName;
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

export const validateVariableName = (variableName: string, prefix: '??' | '?') => {
  let text = variableName
    // variable name can only contain letters, numbers, underscores and questionmarks
    .replace(/[^a-zA-Z0-9_?]/g, '');

  if (!text.startsWith('?')) {
    text = `?${text}`;
  }

  const match = text.match(/^(\?*)/);
  const leadingQuestionMarksCount = match ? match[0].length : 0;

  if (leadingQuestionMarksCount > 2) {
    text = '??'.concat(text.substring(leadingQuestionMarksCount));
  }

  // Remove unnecessary leading underscores
  if (text.charAt(prefix.length) === '_') {
    text = `${prefix}${text.substring(prefix.length + 1)}`;
  }

  return text;
};

export const getVariableTypeFromQuery = (str: string, variableType: ESQLVariableType) => {
  const match = str.match(/^(\?*)/);
  const leadingQuestionMarksCount = match ? match[0].length : 0;
  if (
    leadingQuestionMarksCount === 2 &&
    variableType !== ESQLVariableType.FIELDS &&
    variableType !== ESQLVariableType.FUNCTIONS
  ) {
    return ESQLVariableType.FIELDS;
  }

  if (
    leadingQuestionMarksCount === 1 &&
    variableType !== ESQLVariableType.TIME_LITERAL &&
    variableType !== ESQLVariableType.VALUES
  ) {
    return ESQLVariableType.VALUES;
  }

  return variableType;
};
