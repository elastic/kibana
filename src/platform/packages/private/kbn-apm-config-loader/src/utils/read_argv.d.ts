/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const getArgValues: (argv: string[], flag: string | string[]) => string[];
export declare const getArgValue: (argv: string[], flag: string | string[]) => string | undefined;
/**
 * Get all flags matching the provided prefix
 * @param argv List of arguments
 * @param flagPrefix Flag prefix to match (either identical or its subkeys)
 * @returns Array of [flag, value] pairs for the matching flags. The returned flags are cleaned up from the `--` prefix.
 */
export declare const getAllArgKeysValueWithPrefix: (
  argv: string[],
  flagPrefix: string
) => Array<[string, string | undefined]>;
