/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { monaco } from '@kbn/monaco';

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
