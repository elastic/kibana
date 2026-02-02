/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash, randomBytes } from 'node:crypto';

export function generateTestRunId() {
  return randomBytes(8).toString('hex');
}

export function computeTestID(testFilePath: string, testTitle: string) {
  if (testFilePath.length === 0 || testTitle.length === 0) {
    throw new Error(
      'Inputs used to compute test IDs cannot be zero-length' +
        ` (got testFilePath='${testFilePath}', testTitle='${testTitle}')`
    );
  }

  return [testFilePath, testTitle]
    .map((input) => createHash('sha256').update(input).digest('hex').slice(0, 15))
    .join('-');
}
