/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

process.argv.push('--runInBand');

const { runJest } = require('./jest.ts');

runJest('jest.integration.config.js').catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.stack || error.message);
    process.exit((error as Error & { exitCode?: number }).exitCode ?? 1);
  }

  console.error(error);
  process.exit(1);
});
