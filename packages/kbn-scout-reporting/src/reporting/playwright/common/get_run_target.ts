/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function getRunTarget(argv: string[] = process.argv): string {
  const tagsToMode: Record<string, string> = {
    '@ess': 'stateful',
    '@svlSearch': 'serverless-search',
    '@svlOblt': 'serverless-oblt',
    '@svlSecurity': 'serverless-security',
  };

  const grepIndex = argv.findIndex((arg) => arg === '--grep' || arg.startsWith('--grep='));
  if (grepIndex !== -1) {
    const tag = argv[grepIndex].startsWith('--grep=')
      ? argv[grepIndex].split('=')[1]
      : argv[grepIndex + 1] || ''; // Look at the next argument if '--grep' is used without `=`

    return tagsToMode[tag] || 'undefined';
  }

  return 'undefined';
}
