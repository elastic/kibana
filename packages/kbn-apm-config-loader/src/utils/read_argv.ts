/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const getArgValues = (argv: string[], flag: string | string[]): string[] => {
  const flags = typeof flag === 'string' ? [flag] : flag;
  const values: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (flags.includes(argv[i]) && argv[i + 1]) {
      values.push(argv[++i]);
    }
  }
  return values;
};

export const getArgValue = (argv: string[], flag: string | string[]): string | undefined => {
  const values = getArgValues(argv, flag);
  if (values.length) {
    return values[0];
  }
};
