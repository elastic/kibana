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

export function getTestIDForTitle(title: string) {
  return createHash('sha256').update(title).digest('hex').slice(0, 31);
}
