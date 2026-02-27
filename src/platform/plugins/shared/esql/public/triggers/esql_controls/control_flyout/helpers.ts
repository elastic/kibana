/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { monaco } from '@kbn/monaco';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { ESQLVariableType, VariableNamePrefix } from '@kbn/esql-types';
import { TIME_SPAN_UNITS } from '@kbn/esql-language';
import { css } from '@emotion/react';

function inKnownTimeInterval(timeIntervalUnit: string): boolean {
  return TIME_SPAN_UNITS.some((unit) => unit === timeIntervalUnit.toLowerCase());
}

const getQueryPart = (queryString: string, cursorColumn: number, variable: string) => {
  const queryStringTillCursor = queryString.slice(0, cursorColumn);
  const lastChar = queryStringTillCursor.slice(-1);
  const secondLastChar = queryStringTillCursor.slice(-2, -1);

  if (lastChar === '?') {
    return [
      queryString.slice(0, cursorColumn - 2),
      variable,
      queryString.slice(cursorColumn - 1),
    ].join('');
  } else if (secondLastChar === '?') {
    return [
      queryString.slice(0, cursorColumn - 2),
      variable,
      queryString.slice(cursorColumn - 1),
    ].join('');
  }

  return [
    queryString.slice(0, cursorColumn - 1),
    variable,
    queryString.slice(cursorColumn - 1),
  ].join('');
};

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

    const queryWithVariable = getQueryPart(queryPartToBeUpdated, cursorColumn, variable);
    queryArray[cursorLine - 1] = queryWithVariable;
    return queryArray.join('\n');
  }

  return [getQueryPart(queryString, cursorColumn, variable)].join('');
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

export const getVariableSuggestion = (variableType: ESQLVariableType) => {
  switch (variableType) {
    case ESQLVariableType.FIELDS:
      return 'field';
    case ESQLVariableType.FUNCTIONS:
      return 'function';
    case ESQLVariableType.TIME_LITERAL:
      return 'interval';
    case ESQLVariableType.MULTI_VALUES:
      return 'values';
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

export const flyoutStyles = css({
  '.euiFlyoutBody__overflow': {
    WebkitMaskImage: 'none',
    paddingLeft: 'inherit',
    marginLeft: 'inherit',
    transform: 'initial',
  },
  '.euiFlyoutBody__overflowContent': {
    blockSize: '100%',
  },
});

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
    variableType !== ESQLVariableType.VALUES &&
    variableType !== ESQLVariableType.MULTI_VALUES
  ) {
    return ESQLVariableType.VALUES;
  }

  return variableType;
};

export const getVariableNamePrefix = (type: ESQLVariableType) => {
  switch (type) {
    case ESQLVariableType.FIELDS:
    case ESQLVariableType.FUNCTIONS:
      return VariableNamePrefix.IDENTIFIER;
    case ESQLVariableType.VALUES:
    case ESQLVariableType.TIME_LITERAL:
    case ESQLVariableType.MULTI_VALUES:
    default:
      return VariableNamePrefix.VALUE;
  }
};

export const checkVariableExistence = (
  esqlVariables: ESQLControlVariable[],
  variableName: string
): boolean => {
  const variableNameWithoutQuestionmark = variableName.replace(/^\?+/, '');
  const match = variableName.match(/^(\?*)/);
  const leadingQuestionMarksCount = match ? match[0].length : 0;

  return esqlVariables.some((variable) => {
    const prefix = getVariableNamePrefix(variable.type);
    if (leadingQuestionMarksCount === 2) {
      if (prefix === VariableNamePrefix.IDENTIFIER) {
        return variable.key === variableNameWithoutQuestionmark;
      }
      return false;
    }
    if (leadingQuestionMarksCount === 1) {
      if (prefix === VariableNamePrefix.VALUE) {
        return variable.key === variableNameWithoutQuestionmark;
      }
      return false;
    }
    return false;
  });
};
