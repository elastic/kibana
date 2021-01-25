/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const containsChars = (chars: string | string[]) => (value: string) => {
  const charToArray = Array.isArray(chars) ? (chars as string[]) : ([chars] as string[]);

  const charsFound = charToArray.reduce(
    (acc, char) => (value.includes(char) ? [...acc, char] : acc),
    [] as string[]
  );

  return {
    charsFound,
    doesContain: charsFound.length > 0,
  };
};
