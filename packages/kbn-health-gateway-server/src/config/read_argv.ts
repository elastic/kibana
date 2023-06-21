/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Borrowed from @kbn/apm-config-loader.
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
