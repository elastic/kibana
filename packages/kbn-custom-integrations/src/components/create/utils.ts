/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const replaceSpecialChars = (value: string) => {
  // Replace special characters with _
  const replacedSpecialCharacters = value.replaceAll(/[^a-zA-Z0-9_]/g, '_');
  // Allow only one _ in a row
  const noRepetitions = replacedSpecialCharacters.replaceAll(/[\_]{2,}/g, '_');
  return noRepetitions;
};
