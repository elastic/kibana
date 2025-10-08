/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Convert flags in format `--flag=value` to `--flag value`
 * @param argv List of arguments
 * @returns Array of arguments with flags in `--flag=value` format normalized to `--flag value`
 */
const normalizeArgFormat = (argv: string[]): string[] => {
  return argv.flatMap((arg) => {
    if (/^--\w+/.test(arg) && arg.includes('=')) {
      const [key, ...valueParts] = arg.split('=');
      return [key, valueParts.join('=')];
    }
    return [arg];
  });
};

export const getArgValues = (argv: string[], flag: string | string[]): string[] => {
  const flags = typeof flag === 'string' ? [flag] : flag;

  const normalizedArgv = normalizeArgFormat(argv);

  const values: string[] = [];
  for (let i = 0; i < normalizedArgv.length; i++) {
    if (flags.includes(normalizedArgv[i])) {
      if (
        normalizedArgv[i + 1] &&
        // Take the next argument as the value if it's not another flag
        !/^--\w+/.test(normalizedArgv[i + 1]) && // In the --flag format
        !/^-\w$/.test(normalizedArgv[i + 1]) // In the -f format
      ) {
        values.push(normalizedArgv[++i]);
      }
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

/**
 * Get all flags matching the provided prefix
 * @param argv List of arguments
 * @param flagPrefix Flag prefix to match (either identical or its subkeys)
 * @returns Array of [flag, value] pairs for the matching flags. The returned flags are cleaned up from the `--` prefix.
 */
export const getAllArgKeysValueWithPrefix = (
  argv: string[],
  flagPrefix: string
): Array<[string, string | undefined]> => {
  const flags = normalizeArgFormat(argv).filter(
    (arg) =>
      typeof arg === 'string' &&
      arg.startsWith('--') &&
      (arg === flagPrefix || // Exact match
        arg.startsWith(`${flagPrefix}.`)) // Subkey match
  );
  return flags.map((flag) => [
    flag.slice(2), // remove the leading '--'
    getArgValue(argv, flag),
  ]);
};
