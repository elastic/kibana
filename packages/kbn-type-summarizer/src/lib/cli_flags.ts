/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import getopts from 'getopts';

interface ParseCliFlagsOptions {
  alias?: Record<string, string>;
  boolean?: string[];
  string?: string[];
  default?: Record<string, unknown>;
}

export function parseCliFlags(argv = process.argv.slice(2), options: ParseCliFlagsOptions = {}) {
  const unknownFlags: string[] = [];

  const string = options.string ?? [];
  const boolean = ['help', 'verbose', 'debug', 'quiet', 'silent', ...(options.boolean ?? [])];
  const alias = {
    v: 'verbose',
    d: 'debug',
    h: 'help',
    ...options.alias,
  };

  const rawFlags = getopts(argv, {
    alias,
    boolean,
    string,
    default: options.default,
    unknown(name) {
      unknownFlags.push(name);
      return false;
    },
  });

  return {
    rawFlags,
    unknownFlags,
  };
}
